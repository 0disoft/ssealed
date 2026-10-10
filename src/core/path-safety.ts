import { lstat, mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { SsealedError } from "./errors.js";

const windowsDevicePattern = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;

export function assertSafeTemplatePath(templatePath: string): void {
  if (templatePath.length === 0) {
    throw new SsealedError("PATH_SAFETY_ERROR", "Template path cannot be empty.");
  }

  if (templatePath.includes("\0")) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Template path contains a null byte: ${templatePath}`);
  }

  if (path.isAbsolute(templatePath) || /^[a-zA-Z]:/.test(templatePath) || templatePath.startsWith("\\\\")) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Template path must be relative: ${templatePath}`);
  }

  if (templatePath.includes("\\")) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Template path must use forward slashes: ${templatePath}`);
  }

  const parts = templatePath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Template path contains an unsafe segment: ${templatePath}`);
  }

  for (const part of parts) {
    if (windowsDevicePattern.test(part) || /[\u0000-\u001f<>:"|?*]/u.test(part) || /[. ]$/u.test(part)) {
      throw new SsealedError("PATH_SAFETY_ERROR", `Template path contains a platform-unsafe segment: ${templatePath}`);
    }
  }
}

export function toDisplayPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function resolveInsideTarget(targetRoot: string, templatePath: string): string {
  assertSafeTemplatePath(templatePath);
  const resolvedRoot = path.resolve(targetRoot);
  const resolvedTarget = path.resolve(resolvedRoot, ...templatePath.split("/"));
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Resolved path escapes target directory: ${templatePath}`);
  }
  return resolvedTarget;
}

export async function ensureDirectoryInsideTarget(targetRoot: string, directoryPath: string): Promise<void> {
  const resolvedRoot = path.resolve(targetRoot);
  const resolvedDirectory = path.resolve(directoryPath);
  const relative = path.relative(resolvedRoot, resolvedDirectory);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Directory escapes target root: ${directoryPath}`);
  }

  const rootStat = await lstatIfExists(resolvedRoot);
  let rootReal: string;
  if (rootStat === undefined) {
    const existingAncestor = await nearestExistingAncestor(resolvedRoot);
    if (existingAncestor.stat.isSymbolicLink()) {
      throw new SsealedError(
        "PATH_SAFETY_ERROR",
        `Refusing to create target under symlinked path: ${toDisplayPath(existingAncestor.path)}`,
      );
    }
    const ancestorReal = await realpath(existingAncestor.path);
    const missingPath = path.relative(existingAncestor.path, resolvedRoot);
    const canonicalRoot = path.resolve(ancestorReal, missingPath);
    await mkdir(canonicalRoot, { recursive: true });
    rootReal = await realpath(canonicalRoot);
  } else {
    if (rootStat.isSymbolicLink()) {
      throw new SsealedError("PATH_SAFETY_ERROR", `Refusing to use symlinked target directory: ${toDisplayPath(resolvedRoot)}`);
    }
    rootReal = await realpath(resolvedRoot);
  }

  await mkdir(path.resolve(rootReal, relative), { recursive: true });
}

export async function assertNoSymlinkInParentPath(targetRoot: string, filePath: string): Promise<void> {
  const root = path.resolve(targetRoot);
  const rootStat = await lstatIfExists(root);
  if (rootStat?.isSymbolicLink()) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Refusing to use symlinked target directory: ${toDisplayPath(root)}`);
  }
  const parent = path.dirname(path.resolve(filePath));
  const relative = path.relative(root, parent);
  const parts = relative === "" ? [] : relative.split(path.sep).filter(Boolean);
  let current = root;

  for (const part of parts) {
    current = path.join(current, part);
    const stat = await lstat(current).catch((error: unknown) => {
      if (isNodeError(error) && error.code === "ENOENT") {
        return undefined;
      }
      throw error;
    });
    if (stat?.isSymbolicLink()) {
      throw new SsealedError("PATH_SAFETY_ERROR", `Refusing to access symlinked directory: ${toDisplayPath(path.relative(root, current))}`);
    }
  }
}

export async function assertNoSymlinkInPath(targetRoot: string, filePath: string): Promise<void> {
  await assertNoSymlinkInParentPath(targetRoot, filePath);
  const root = path.resolve(targetRoot);
  const existing = await lstat(filePath).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (existing?.isSymbolicLink()) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Refusing to access symlink: ${toDisplayPath(path.relative(root, filePath))}`);
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function lstatIfExists(filePath: string): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  return lstat(filePath).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
}

async function nearestExistingAncestor(
  filePath: string,
): Promise<{ readonly path: string; readonly stat: Awaited<ReturnType<typeof lstat>> }> {
  let current = path.resolve(filePath);
  while (true) {
    const stat = await lstatIfExists(current);
    if (stat !== undefined) {
      return { path: current, stat };
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new SsealedError("PATH_SAFETY_ERROR", `Cannot locate an existing parent directory for target: ${toDisplayPath(filePath)}`);
    }
    current = parent;
  }
}
