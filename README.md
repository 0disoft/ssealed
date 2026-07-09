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
bun dist/cli.js init --scope backend --repo-type api-service --runner none
```

## Development Commands

```sh
bun install
bun run typecheck
bun run test
bun run build
bun run smoke:node-runtime
bun run smoke:bun-runtime
bun run smoke:packed-install
bun run check
```

## Release Automation

Releases are tag-driven. Push a version tag that matches `package.json`, such as `v0.6.4`, and GitHub Actions will run the release workflow.

The release workflow:

- installs dependencies with Bun;
- runs `bun run check`;
- verifies the packed package can be installed and executed through the npm bin shim;
- verifies the npm package contents with `npm pack --dry-run --json`;
- compares package integrity when the npm version already exists, so a rerun cannot attach a GitHub Release to a different tarball;
- publishes the package to npm;
- creates or updates the matching GitHub Release.

The CI workflow runs on pull requests and `main` pushes. It installs with Bun, then runs typecheck, tests, and build before release-only smoke and publication steps are needed.

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
ssealed init [target] --scope backend|frontend|fullstack|general|mobile|infra|data
ssealed adopt [target] --scope backend|frontend|fullstack|general|mobile|infra|data
ssealed update [target]
ssealed upgrade [target]
ssealed doctor [target]
ssealed doctor [target] --strict
ssealed eject runner [target]
ssealed init [target] --repo-type generic|cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo
ssealed init [target] --addon github-action --addon docs-site
ssealed init [target] --density minimal|standard|strict
ssealed init [target] --runner none|make|just|task|npm|pnpm
ssealed adopt [target] --repo-type library --density minimal --runner none
ssealed update [target] --dry-run --json
ssealed upgrade [target] --repo-type api-service --density strict --runner make --force
ssealed update [target] --break-stale-lock
ssealed doctor [target] --json
ssealed doctor [target] --strict --json
ssealed --help
ssealed --version
ssealed init --help
```

`init` creates a new scaffold and refuses targets with an existing valid `.ssealed/manifest.json`.
`adopt` initializes `.ssealed/manifest.json` for an existing repository while preserving differing regular files as `project-owned`; missing scaffold files are created, and `.gitignore` still receives the managed ignore block.
`update` reapplies the existing manifest settings, accepts project-owned edits to seeded documents, keeps deleted seeded documents retired, and refreshes manifest metadata without changing `scope`, repository type, addons, `density`, or `runner`.
`upgrade` is the explicit path for changing scaffold settings.
`doctor` checks scaffold lifecycle metadata. It accepts normal project evolution for seeded documents by default. Use `doctor --strict` when you intentionally want checksum drift detection against accepted manifest content.
`eject runner` marks an npm or pnpm `package.json` runner block as explicitly project-owned in `.ssealed/manifest.json`.

`--profile` remains accepted as an alias for `--repo-type`.

## Scope Matrix

Scopes describe the ownership area of the repository.

- `backend`: common scaffold plus backend docs, `api/openapi.yaml`, DBML, backend skills, backend checklists, and backend validations.
- `frontend`: common scaffold plus `docs/frontend/FRONTEND_DESIGN.md`, consumed backend API contracts, frontend skills, frontend checklists, and frontend validations.
- `fullstack`: common plus backend and frontend surfaces. It does not generate `contracts/backend-api/` because `api/openapi.yaml` is the source of truth.
- `general`: common product, architecture, engineering, operational, validation, checklist, and agent scaffolds.
- `mobile`: common scaffold plus mobile product surface, platform support, offline/sync, store release, mobile skill, checklist, and validation documents.
- `infra`: common scaffold plus infrastructure contract, environment, change-plan, drift, rollback, infra skill, checklist, and validation documents. It does not generate runtime infrastructure code.
- `data`: common scaffold plus data pipeline contract, lineage, quality, privacy, retention, data skill, checklist, and validation documents.

Backend scope does not generate frontend docs because ownership drift makes agents edit the wrong surface. Frontend scope does not generate backend internals because database, migration, and authorization implementation details belong to backend owners.

## Repository Type Matrix

Repository types describe the shape of the repository. They are intentionally separate from scope so a backend-owned repository can be an API service, a general repository can still draft CLI contracts, and a fullstack repository can also carry desktop-app release and update contracts.

- `generic`: default behavior. Generates no repository-shape-specific files.
- `cli-tool`: adds CLI command, configuration, output, exit-code, shell-completion, checklist, validation, and agent-skill documents.
- `api-service`: adds API service lifecycle, idempotency, rate-limit, SLO, checklist, validation, and agent-skill documents. If the selected scope does not already own `api/openapi.yaml`, the repository type adds an OpenAPI skeleton and API response examples.
- `desktop-app`: adds installer, auto-update, crash-reporting, local-data, OS-support, desktop-security, checklist, validation, and agent-skill documents.
- `library`: adds public API, semantic versioning, compatibility, package surface, migration guide, checklist, validation, and agent-skill documents.
- `web-app`: adds web app routing, rendering, browser-state, frontend observability, checklist, validation, and agent-skill documents.
- `mobile-app`: adds app lifecycle, offline/sync, store release, checklist, validation, and agent-skill documents.
- `sdk`: adds SDK public API, compatibility, examples, checklist, validation, and agent-skill documents.
- `worker-service`: adds job contract, retry/idempotency, queue operations, checklist, validation, and agent-skill documents.
- `infra-module`: adds module interface, environment contract, drift policy, checklist, validation, and agent-skill documents.
- `data-pipeline`: adds lineage, quality gates, retention/privacy, checklist, validation, and agent-skill documents.
- `github-action`: adds action contract, inputs/outputs, permissions, checklist, validation, and agent-skill documents.
- `browser-extension`: adds extension contract, permissions, content-script boundaries, checklist, validation, and agent-skill documents.
- `plugin`: adds host contract, extension points, compatibility, checklist, validation, and agent-skill documents.
- `docs-site`: adds information architecture, publishing, content quality, checklist, validation, and agent-skill documents.
- `monorepo`: adds workspace boundaries, package ownership, change coordination, checklist, validation, and agent-skill documents.

`--repo-type` defaults to `generic`, so existing commands keep the same scaffold shape unless a repository type is explicitly selected.

## Addons

Use `--addon` when one repository needs extra repository-shape surfaces beyond its primary type.

```sh
ssealed init --scope general --repo-type cli-tool --addon github-action --addon docs-site
```

Addons may be any repository type except `generic`. They are recorded in `.ssealed/manifest.json` as `addons` and are compared by `update`; use `upgrade` to change them intentionally.

## Density Matrix

- `minimal`: creates the core agent, documentation, checklist, validation, hygiene, and selected scope/repository-type essentials.
- `standard`: default behavior. Adds the normal operating, engineering, API, UI, diagram, and validation surfaces.
- `strict`: adds deeper risk, release-readiness, service-level, data-integrity, migration, package-surface, and repository-type-specific hardening surfaces.

Use `minimal` for small repos that need a compact starting point, `standard` for normal teams, and `strict` when the repository needs stronger operational, security, or release review coverage.

## Runner Matrix

- `none`: generates no executable runner file.
- `make`: generates a `Makefile`.
- `just`: generates a `justfile`.
- `task`: generates `Taskfile.yml`.
- `npm`: creates or merges `package.json` scripts.
- `pnpm`: creates or merges `package.json` scripts and uses pnpm wording in generated script messages.

Runner files are optional because many repositories already have their own task runner. When generated, unconfigured validation commands fail instead of faking success.

## Overwrite Policy

Existing files are not overwritten by default. Identical files are marked `unchanged`. During `init`, different existing files are marked `conflict`. During `adopt`, different existing regular files are marked `customized` with `ownership: project-owned` and are not overwritten, even with `--force`. During `update` and `upgrade`, seeded files that already have project-owned edits are marked `customized` and are not overwritten. Seeded files that were deleted after a previous run are marked `retired` and are not recreated.

`--force` overwrites conflicting files only when the current file content matches the generated checksum recorded for that path in the previous `.ssealed/manifest.json`. The manifest is a local previous-run record, not a security boundary, and it never authorizes overwriting unrelated user files at the same path. Existing user-authored `.gitignore` patterns are preserved even with `--force`; only the ssealed managed block is replaced. Seeded files with project-owned edits stay project-owned even after `update` accepts their current checksum.

Before each write, `ssealed` rechecks that the target file still matches the state used to create the plan. If a file appeared or changed between planning and writing, the run stops instead of committing a stale plan.

## Manifest Behavior

Every write run refreshes `.ssealed/manifest.json` with tool version, generation timestamp, scope, profile, addons, density, runner, file paths, kinds, ownership, presence, lifecycle status, and SHA-256 checksums of normalized LF content. The `profile` field is retained for manifest compatibility and represents the selected primary repository type.

Manifest file ownership has four meanings:

- `seeded`: ssealed created an initial document or repository file, but the project is expected to edit, move, or delete it over time.
- `block-managed`: ssealed manages a bounded block or script set inside a user-owned file, such as `.gitignore` or generated validation scripts in `package.json`.
- `project-owned`: the project explicitly owns the file or surface, such as an adopted existing file or an ejected package runner block.
- `managed`: ssealed owns the full file content as tool metadata.

Seeded files use `presence: optional`; missing seeded files can be retained as `status: retired`. Active files keep `initialChecksum`, `generatedChecksum`, and `acceptedChecksum` so tooling can distinguish original template content, the last generated scaffold content, and project-accepted content. The legacy `checksum` field remains as the accepted checksum for compatibility.

The manifest helps identify previously generated files, but it never authorizes silent overwrite of user-modified files. Default `doctor` treats modified seeded files as `customized`, missing optional seeded files as `retired`, and explicitly ejected files as `project-owned`; these are healthy lifecycle states. `doctor --strict` still accepts `project-owned` files because ssealed no longer owns that surface.

`init` and `adopt` are intentionally conservative and refuse a target that already has a valid `.ssealed/manifest.json`. Use `adopt` for an existing repository that should gain scaffold metadata without handing existing files to ssealed. Use `update` to reapply the recorded scaffold settings, or use `upgrade` to explicitly change `scope`, repository type, addons, `density`, or `runner`. `update` rejects setting changes so old generated files do not silently become untracked scaffold leftovers, but it does not force project documents back to their seed text.

## Path Safety

Template paths must be relative, normalized, and contained by the selected target directory.

`ssealed` rejects absolute paths, parent traversal, Windows reserved names, unsafe path characters, and `bunfig.toml` generation. Scaffold writes refuse symlinked generated directories and symlinked existing files instead of following them outside the target.

Write commands use `.ssealed-init.lock` to keep concurrent `ssealed` runs from writing the same target. If a previous process crashed and left an old lock, rerun with `--break-stale-lock`; the lock is removed only when its metadata is old enough and its recorded process is not still alive on the current host.

`doctor` and `--dry-run` are read-only, but they still refuse to run while an active write lock exists so they do not report a mixed in-progress scaffold state.

Scaffold writes run in bounded parallel batches for regular files, then write `.ssealed/manifest.json` last. If any batched write fails, already written files are rolled back before the lock is released. During write commands, `SIGINT` and `SIGTERM` are handled the same way: ssealed stops starting new batches, rolls back already written files, and releases `.ssealed-init.lock`.

The generated `.gitignore` block includes `.ssealed-init.lock` so stale lock metadata is not committed accidentally.

`doctor` validates only the managed `.gitignore` block for `.gitignore`, so project-owned ignore rules may live outside the ssealed markers. Manifests generated before `.ssealed-init.lock` was added to the managed block remain accepted for compatibility. For npm and pnpm runners, use `ssealed eject runner [target]` before replacing generated validation scripts with project-owned package scripts; doctor then reports `package.json` as `project-owned` instead of `block-modified`.

## Hygiene File Behavior

Every scope generates:

- `.editorconfig` for encoding, LF endings, final newline, whitespace, and Makefile tab policy.
- `.gitattributes` for Git LF text normalization and binary asset diff policy.
- `.gitignore` for OS files, editor files, logs, env secrets, dependency directories, build output, coverage, cache, temp files, and package-manager debug logs.

`.env.example` is explicitly allowed.

## `.gitignore` Merge Policy

If `.gitignore` does not exist, `ssealed` creates it with a managed block.

If `.gitignore` exists and has no managed block, `ssealed` appends its full managed block. Existing user-authored ignore patterns are preserved outside the block, even when they duplicate managed defaults:

```text
# >>> ssealed ignore patterns >>>
...
# <<< ssealed ignore patterns <<<
```

If a managed block exists and differs from the current generated block, the file is a conflict unless `--force` is used.

## Examples

```sh
ssealed init --scope backend --runner none
ssealed adopt ./existing-lib --scope general --repo-type library --density minimal --runner none
ssealed init --scope frontend --density minimal --runner just
ssealed init ./my-service --scope backend --repo-type api-service --runner make --yes
ssealed init --scope general --repo-type cli-tool --addon github-action --dry-run
ssealed init --scope general --repo-type library --runner npm
ssealed init --scope fullstack --repo-type desktop-app --runner pnpm
ssealed init --scope infra --repo-type infra-module --density strict
ssealed init --scope data --repo-type data-pipeline --addon docs-site
ssealed update ./my-service --dry-run --json
ssealed upgrade ./my-service --repo-type api-service --density strict --runner make --force
ssealed doctor ./my-service --json
ssealed doctor ./my-service --strict --json
ssealed eject runner ./my-service --json
```

`--json` prints a public result shape with command, target, scope, profile, repoType, addons, density, runner, file paths, kinds, ownership, presence, actions, lifecycle statuses, reasons, conflicts, warnings, and written paths. Runtime failures also return `{ "ok": false, "error": { "code": "...", "message": "..." } }`. JSON output does not include generated file contents or existing file contents.

## Why `.agents/skills`

Generated repositories use `.agents/skills/.../SKILL.md` because repo-scoped agent skills are expected to live under `.agents/skills`. Each generated skill includes `name` and `description` frontmatter.

## Why No Generated Bun Runner in v1

The `ssealed` CLI itself supports Bun execution. That is separate from generated scaffold runner support.

`bunfig.toml` and `--runner bun` are intentionally not generated in v1. Bun runner support should be added later only with explicit runner design, documentation, and tests.
