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
    if (windowsDevicePattern.test(part) || /[<>:"|?*]/u.test(part) || /[. ]$/u.test(part)) {
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
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Resolved path escapes target directory: ${templatePath}`);
  }
  return resolvedTarget;
}

export async function ensureDirectoryInsideTarget(targetRoot: string, directoryPath: string): Promise<void> {
  await assertNoSymlinkInExistingPath(targetRoot);
  const rootReal = await realpath(targetRoot).catch(async () => {
    await mkdir(targetRoot, { recursive: true });
    return realpath(targetRoot);
  });

  const resolvedDirectory = path.resolve(directoryPath);
  const relative = path.relative(rootReal, resolvedDirectory);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Directory escapes target root: ${directoryPath}`);
  }

  await mkdir(resolvedDirectory, { recursive: true });
}

async function assertNoSymlinkInExistingPath(directoryPath: string): Promise<void> {
  const resolved = path.resolve(directoryPath);
  const parsed = path.parse(resolved);
  const relative = path.relative(parsed.root, resolved);
  const parts = relative === "" ? [] : relative.split(path.sep).filter(Boolean);
  let current = parsed.root;

  for (const part of parts) {
    current = path.join(current, part);
    const stat = await lstat(current).catch((error: unknown) => {
      if (isNodeError(error) && error.code === "ENOENT") {
        return undefined;
      }
      throw error;
    });
    if (stat === undefined) {
      return;
    }
    if (stat.isSymbolicLink()) {
      throw new SsealedError("PATH_SAFETY_ERROR", `Refusing to create target under symlinked path: ${toDisplayPath(current)}`);
    }
  }
}

export async function assertNoSymlinkInPath(targetRoot: string, filePath: string): Promise<void> {
  const root = path.resolve(targetRoot);
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
      throw new SsealedError("PATH_SAFETY_ERROR", `Refusing to write through symlinked directory: ${toDisplayPath(path.relative(root, current))}`);
    }
  }

  const existing = await lstat(filePath).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (existing?.isSymbolicLink()) {
    throw new SsealedError("PATH_SAFETY_ERROR", `Refusing to overwrite symlink: ${toDisplayPath(path.relative(root, filePath))}`);
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
