# ssealed

`ssealed` is a TypeScript CLI that creates LLM-friendly design scaffolds for repositories.

It does not create application source code. It creates documentation, agent instructions, contract files, validation routers, checklists, Mermaid diagrams, GitHub templates, repository hygiene files, and optional task runner entrypoints.

## Runtime and Development

The published `ssealed` CLI officially supports Node.js 24+ and Bun 1.3+ as CLI runtimes.

This repository is developed with Bun. Use `bun.lock`, `bun install`, and `bun run ...` for local development. Generated target scaffolds do not require Bun, and Bun is not a first-class generated runner in v1.

The npm package keeps the portable `ssealed` binary name. npm-installed command shims normally follow the Node.js shebang, while Bun users can execute the same built CLI entrypoint with Bun when they want Bun runtime semantics.

## Local Usage

```sh
bun install
bun run build
node dist/cli.js init --scope backend --runner none
bun dist/cli.js init --scope backend --runner none
```

## Development Commands

```sh
bun install
bun run typecheck
bun run test
bun run build
bun run smoke:node-runtime
bun run smoke:bun-runtime
bun run check
```

## Release Automation

Releases are tag-driven. Push a version tag that matches `package.json`, such as `v0.2.1`, and GitHub Actions will run the release workflow.

The release workflow:

- installs dependencies with Bun;
- runs `bun run check`;
- verifies the npm package contents with `npm pack --dry-run --json`;
- publishes the package to npm;
- creates or updates the matching GitHub Release.

npm publishing uses Trusted Publishing through GitHub Actions. Configure the npm package trusted publisher once with:

- Package: `ssealed`
- Publisher: GitHub Actions
- Repository owner: `0disoft`
- Repository name: `ssealed`
- Workflow filename: `release.yml`
- Environment: leave empty unless the workflow is changed to use one

Do not store an npm token in the repository unless Trusted Publishing is unavailable.

## CLI

```sh
ssealed init [target]
ssealed init [target] --scope backend
ssealed init [target] --scope frontend
ssealed init [target] --scope fullstack
ssealed init [target] --scope design
ssealed init [target] --runner none
ssealed init [target] --runner make
ssealed init [target] --runner just
ssealed init [target] --runner task
ssealed init [target] --runner npm
ssealed init [target] --runner pnpm
ssealed init [target] --yes
ssealed init [target] --dry-run
ssealed init [target] --force
ssealed init [target] --json
ssealed --help
ssealed --version
ssealed init --help
```

## Scope Matrix

- `backend`: common scaffold plus backend docs, `api/openapi.yaml`, DBML, backend skills, backend checklists, and backend validations.
- `frontend`: common scaffold plus `docs/frontend/FRONTEND_DESIGN.md`, consumed backend API contracts, frontend skills, frontend checklists, and frontend validations.
- `fullstack`: common plus backend and frontend surfaces. It does not generate `contracts/backend-api/` because `api/openapi.yaml` is the source of truth.
- `design`: common design, architecture, engineering, operational, validation, checklist, and agent scaffolds only.

Backend scope does not generate frontend docs because ownership drift makes agents edit the wrong surface. Frontend scope does not generate backend internals because database, migration, and authorization implementation details belong to backend owners.

## Runner Matrix

- `none`: generates no executable runner file.
- `make`: generates a `Makefile`.
- `just`: generates a `justfile`.
- `task`: generates `Taskfile.yml`.
- `npm`: creates or merges `package.json` scripts.
- `pnpm`: creates or merges `package.json` scripts and uses pnpm wording in generated script messages.

Runner files are optional because many repositories already have their own task runner. When generated, unconfigured validation commands fail instead of faking success.

## Overwrite Policy

Existing files are not overwritten by default. Identical files are marked `unchanged`. Different files are marked `conflict`. If any conflict exists and `--force` is not provided, no files are written.

`--force` overwrites conflicting scaffold-managed files. Existing user-authored `.gitignore` patterns are preserved even with `--force`; only the ssealed managed block is replaced.

## Manifest Behavior

Every run writes `.ssealed/manifest.json` with tool version, generation timestamp, scope, runner, generated file paths, kinds, and SHA-256 checksums of normalized LF content.

The manifest helps identify previously generated files, but it never authorizes silent overwrite of user-modified files.

## Path Safety

Template paths must be relative, normalized, and contained by the selected target directory.

`ssealed` rejects absolute paths, parent traversal, Windows reserved names, unsafe path characters, and `bunfig.toml` generation. Scaffold writes refuse symlinked generated directories and symlinked existing files instead of following them outside the target.

## Hygiene File Behavior

Every scope generates:

- `.editorconfig` for encoding, LF endings, final newline, whitespace, and Makefile tab policy.
- `.gitattributes` for Git LF text normalization and binary asset diff policy.
- `.gitignore` for OS files, editor files, logs, env secrets, dependency directories, build output, coverage, cache, temp files, and package-manager debug logs.

`.env.example` is explicitly allowed.

## `.gitignore` Merge Policy

If `.gitignore` does not exist, `ssealed` creates it with a managed block.

If `.gitignore` exists and has no managed block, `ssealed` appends only missing default ignore patterns inside:

```text
# >>> ssealed ignore patterns >>>
...
# <<< ssealed ignore patterns <<<
```

If a managed block exists and differs from the current generated block, the file is a conflict unless `--force` is used.

## Examples

```sh
ssealed init --scope backend --runner none
ssealed init --scope frontend --runner just
ssealed init ./my-service --scope backend --runner make --yes
ssealed init --scope fullstack --runner pnpm
ssealed init --scope design --dry-run
```

## Why `.agents/skills`

Generated repositories use `.agents/skills/.../SKILL.md` because repo-scoped agent skills are expected to live under `.agents/skills`. Each generated skill includes `name` and `description` frontmatter.

## Why No Generated Bun Runner in v1

The `ssealed` CLI itself supports Bun execution. That is separate from generated scaffold runner support.

`bunfig.toml` and `--runner bun` are intentionally not generated in v1. Bun runner support should be added later only with explicit runner design, documentation, and tests.
