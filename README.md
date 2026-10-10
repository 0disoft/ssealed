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

Releases are tag-driven. Push a version tag that matches `package.json`, such as `v0.7.60`, and GitHub Actions will run the release workflow.

The release workflow:

- installs dependencies with Bun;
- runs `bun run check`;
- packs a release tarball and verifies that exact file can be installed and executed through the npm bin shim;
- compares package integrity when the npm version already exists, so a rerun cannot attach a GitHub Release to a different tarball;
- publishes the verified tarball to npm;
- creates or updates the matching GitHub Release.

The CI workflow runs on pull requests and `main` pushes. It installs with Bun and runs `bun run check`, covering typecheck, tests, build, runtime smoke, package contents, and packed installation. Package contents are checked once through that command. Publication remains exclusive to the release workflow.

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
ssealed eject runner [target] [--dry-run]
ssealed init [target] --repo-type generic|cli-tool|api-service|desktop-app|library|web-app|mobile-app|sdk|worker-service|infra-module|data-pipeline|github-action|browser-extension|plugin|docs-site|monorepo
ssealed init [target] --addon github-action --addon docs-site
ssealed init [target] --density minimal|standard|strict
ssealed init [target] --runner none|make|just|task|npm|pnpm
ssealed adopt [target] --repo-type library --density minimal --runner none
ssealed update [target] --dry-run --json
ssealed upgrade [target] --repo-type api-service --density strict --runner make --force
ssealed upgrade [target] --clear-addons
ssealed update [target] --break-stale-lock
ssealed doctor [target] --json
ssealed doctor [target] --strict --json
ssealed --help
ssealed --version
ssealed init --help
```

Use `ssealed <command> --help` for that command's syntax, supported options, accepted values, and an example. For example, `ssealed eject --help` shows the required `runner` subject, while `ssealed update --help` directs setting changes to `upgrade`.

Omitting `[target]` or passing `.` selects the current directory. An explicitly empty target, such as `ssealed init "" --scope general`, fails with `INVALID_TARGET` before reading the target, creating a lock, or writing files. This prevents an empty path variable in a script from silently selecting the current directory.

`init` creates a new scaffold and refuses targets with an existing valid `.ssealed/manifest.json`.
`adopt` initializes `.ssealed/manifest.json` for an existing repository while preserving differing regular files as `project-owned`; missing scaffold files are created, and `.gitignore` still receives the managed ignore block.
`update` reapplies the existing manifest settings, accepts project-owned edits to seeded documents, keeps deleted seeded documents retired, and refreshes manifest metadata without changing `scope`, repository type, addons, `density`, or `runner`.
`upgrade` is the explicit path for changing scaffold settings.
If an unchanged previously generated seeded file differs from the upgraded template, `upgrade` reports a conflict and writes nothing until you rerun it with `--force`. This prevents accepting new settings while retaining obsolete generated instructions. Actual user edits remain preserved, including with `--force`, and the result identifies customized files requiring manual review against the upgraded settings.
`update`, `upgrade`, and `eject` require an existing target. A missing target returns `MISSING_MANIFEST` without creating its directory or missing parent directories. Invalid `eject` subjects are rejected before filesystem changes.
`doctor` checks scaffold lifecycle metadata. It accepts normal project evolution for seeded documents by default. Use `doctor --strict` when you intentionally want checksum drift detection against accepted manifest content.
Unreadable file checks include the failure reason in JSON and human output, such as a refused symlink path or a filesystem permission error.
`eject runner` marks an npm or pnpm `package.json` runner block as explicitly project-owned in `.ssealed/manifest.json`. Use `--dry-run` to inspect that ownership transfer without changing the manifest.
Repeating `eject runner` after ownership is already project-owned reports `unchanged` in both human and JSON output and leaves the manifest and package files untouched.
If an ejected `package.json` is later deleted, repeated updates and upgrades that retain the runner keep it retired, including with `--force`. Retired package runner records are reactivated only by an explicit `upgrade` that changes the runner. A deleted block-managed package file remains required and is restored by `update`.

`--profile` remains accepted as an alias for `--repo-type`.
`init` and `adopt` validate repository type, addons, density, and runner before asking for a missing scope. Invalid settings fail immediately without opening an interactive prompt or creating scaffold files.
When `upgrade --repo-type` promotes an inherited addon to the primary repository type, that addon is removed from the inherited addon list and other addons remain enabled. Explicitly passing the primary type as `--addon` still returns `INVALID_ADDON`.

## Scope Matrix

Scopes describe the ownership area of the repository.

Every scope includes product brief, specification, and system-boundary documents with concrete decision prompts. Standard and strict density add roadmap and risk decisions, domain identities and invariants, runtime effect ordering and recovery, measurable quality scenarios, and an architecture overview that points to the detailed decision owners. Existing document paths and seeded-file ownership behavior are preserved.

Standard and strict density also include an ADR index, a reusable decision-record template, and initial drafts for architecture boundaries and contract sources of truth. Each record captures context, the proposed decision, alternatives, consequences, verification, and supersession. Generated ADRs remain drafts until the project records its own decisions; acceptance is separate from implementation evidence. These existing seeded paths continue to preserve project edits and retired documents during updates.

Mermaid diagrams at standard and strict density contain topic-specific draft views for system composition, operation and release recovery, and the selected scope's contracts. Frontend request views describe client freshness and cancellation; backend and fullstack views describe request validation and effect ownership. The diagram index lists only emitted views and their existing decision sources. All identities, relations, and branch conditions remain `UNDECIDED` prompts, and project edits and retired diagrams retain seeded-file protections. Rendered layout and accessibility require review in the project's chosen Mermaid viewer.

- `backend`: common scaffold plus backend docs, `api/openapi.yaml`, DBML, backend skills, backend checklists, and backend validations.
- `frontend`: common scaffold plus `docs/frontend/FRONTEND_DESIGN.md`, consumed backend API contracts, frontend skills, frontend checklists, and frontend validations.
- `fullstack`: common plus backend and frontend surfaces. It does not generate `contracts/backend-api/` because `api/openapi.yaml` is the source of truth.
- `general`: common product, architecture, engineering, operational, validation, checklist, and agent scaffolds.
- `mobile`: common scaffold plus mobile product surface, platform support, offline/sync, store release, mobile skill, checklist, and validation documents.
- `infra`: common scaffold plus infrastructure contract, environment, change-plan, drift, rollback, infra skill, checklist, and validation documents. It does not generate runtime infrastructure code.
- `data`: common scaffold plus data pipeline contract, lineage, quality, privacy, retention, data skill, checklist, and validation documents.

Mobile, infrastructure, and data scope documents contain topic-specific decisions. Mobile documents cover product boundaries, supported platforms, offline conflicts, and release recovery; infrastructure documents cover resource and state authority, environment isolation, reviewed execution, drift, and recoverability; data documents cover delivery guarantees, lineage, publication gates, and deletion across derived and recovery copies. Each topic points to its scope's README. Density controls which documents exist, and normal seeded-file protections continue to preserve project edits and retired documents.

Backend scope does not generate frontend docs because ownership drift makes agents edit the wrong surface. Frontend scope does not generate backend internals because database, migration, and authorization implementation details belong to backend owners.

Backend and fullstack documents contain distinct decision prompts for server boundaries, identity verification, resource permissions, stored-state authority, HTTP effects and completion, public errors, telemetry, migrations, security, API evolution, and data integrity. Minimal overviews keep unresolved error policy in the documents that exist; higher densities point to the dedicated error policy. Strict evolution and integrity documents point to their applicable API and persistence policies. These prompts do not select a framework, identity provider, database, or accepted project policy, and existing seeded-file protections remain in place.

Frontend design leaves component layers and shared-state policies as project decisions. API integration documents point to the consumed `contracts/backend-api/openapi.yaml` in frontend scope and the owned `api/openapi.yaml` in fullstack scope. The consumed-contract guide records provenance and update ownership; strict accessibility and state/cache documents cover task completion, evidence limits, response freshness, identity isolation, and recovery. Existing paths and density remain unchanged, and scaffold updates continue to preserve edited or retired seeded documents.

Operations documents turn critical journeys and recovery budgets into specific decisions for telemetry, CI scope and cost, artifact promotion, recovery eligibility, active configuration, secret lifecycle, demonstrated restoration, and incident response. Each detailed policy, including strict disaster-recovery and service-level documents, points to the common operational contract. All values and owners remain unresolved until the project supplies decisions and evidence; document density and seeded-file protections are preserved.

Engineering documents specify project invariants and topic-specific design, code-review, performance, security, testing, dependency, and failure-recovery decisions. Performance budgets point to measurable architecture quality scenarios; failure standards point to the operational contract; other engineering policies, including strict threat-model and data-integrity documents, point to project invariants. Testing prompts emphasize independent expected results, relevant failure cases, support gaps, and avoiding redundant evidence. These documents remain drafts with project-specific thresholds and choices unresolved, and updates preserve edited or retired seeded files.

Architecture, backend, engineering, and operations document renderers require explicit topic contracts keyed by file path. A missing contract stops scaffold planning with the affected path instead of silently choosing a generic body from the document title.

Contribution and development guides provide decisions for contribution scope, review evidence, delivery ownership, setup, exact project-owned commands, and safe local state management. Mobile, infrastructure, and data scope READMEs describe their own ownership boundaries and list the decision documents selected for the current density. These guides leave tools, commands, owners, and policies unselected until configured by the project; normal seeded-file protections continue to preserve edits and retired documents.

Common feature, bugfix, refactor, operations-change, dependency-upgrade, and test-hardening skills have distinct discovery descriptions, relevant document links, and task-specific decision guidance. They distinguish requested behavior, demonstrated defects, behavior-preserving restructuring, active operating state, compatibility updates, and independent verification evidence. Validation gaps remain explicit, and these skills do not grant publication or external mutation authority beyond the project task. Existing skill paths, density, and seeded-file protections remain in place.

Backend API, DB migration, frontend UI, mobile app, infrastructure change, and data pipeline skills provide guidance for their contracts, state owners, interruption, and recovery. Frontend skills link the consumed API contract or the fullstack-owned API according to scope; mobile and data skills select the documents for the scope or repository type. Required links point to documents present at the skill's density, including minimal scaffolds.

## Repository Type Matrix

Repository types describe the shape of the repository. They are intentionally separate from scope so a backend-owned repository can be an API service, a general repository can still draft CLI contracts, and a fullstack repository can also carry desktop-app release and update contracts.

- `generic`: default behavior. Generates no repository-shape-specific files.
- `cli-tool`: adds CLI command, configuration, output, exit-code, shell-completion, checklist, validation, and agent-skill documents.
- `api-service`: adds API service lifecycle, idempotency, rate-limit, SLO, checklist, validation, and agent-skill documents. If the selected scope does not already own `api/openapi.yaml`, the repository type adds an OpenAPI skeleton and API response examples.
  Shared service guidance lives in `docs/api-service/README.md`; individual documents ask for lifecycle and deprecation rules, idempotency key scope and replay behavior, quota accounting and counter failures, or measurable SLIs and error-budget decisions. `minimal` includes lifecycle decisions, `standard` also includes idempotency, and `strict` adds rate limits and SLOs.
- `desktop-app`: adds installer, auto-update, crash-reporting, local-data, OS-support, desktop-security, checklist, validation, and agent-skill documents.
  Shared guidance lives in `docs/desktop/README.md`. `minimal` includes installation decisions; `standard` adds update recovery and local-data lifecycle; `strict` also asks for diagnostic consent and redaction, a support matrix, and desktop privilege boundaries.
- `library`: adds public API, semantic versioning, compatibility, package surface, migration guide, checklist, validation, and agent-skill documents.
  Shared guidance lives in `docs/library/README.md`. Individual documents define caller and lifecycle contracts, release compatibility promises, supported consumer environments, installed artifact contents, and ordered migration steps.
- `web-app`: adds topic-specific routing/rendering, browser-state authority and recovery, frontend telemetry, checklist, validation, and agent-skill documents.
- `mobile-app`: adds topic-specific lifecycle/permission, offline conflict/deletion, store promotion/recovery, checklist, validation, and agent-skill documents.
- `sdk`: adds SDK public API, compatibility, examples, checklist, validation, and agent-skill documents.
  Shared guidance lives in `docs/sdk/README.md`. Individual documents cover setup and operation behavior, compatibility with consumers and upstream interfaces, and examples that use the published SDK with explicit prerequisites and cleanup.
- `worker-service`: adds job contract, retry/idempotency, queue operations, checklist, validation, and agent-skill documents.
  Individual documents define job completion and acknowledgment, retry ownership and recovery, and backlog, draining, and poison-job operations.
- `infra-module`: adds module interface, environment contract, drift policy, checklist, validation, and agent-skill documents.
  Individual documents define resource and state authority, environment isolation and promotion, and reviewed reconciliation of declared and actual state.
- `data-pipeline`: adds lineage, quality gates, retention/privacy, checklist, validation, and agent-skill documents.
  Individual documents define dataset grain and backfills, measurable publication gates and quarantine, and retention or deletion across derived and recovery copies.
- `github-action`: adds topic-specific execution/cleanup, input/output and secret handling, permission boundaries, checklist, validation, and agent-skill documents.
- `browser-extension`: adds topic-specific execution/lifecycle, permission grants and revocation, content-script/message boundaries, checklist, validation, and agent-skill documents.
- `plugin`: adds topic-specific host activation/teardown, extension-point ownership, capability compatibility/migration, checklist, validation, and agent-skill documents.
- `docs-site`: adds topic-specific reader/navigation decisions, preview/publishing recovery, content accuracy and examples, checklist, validation, and agent-skill documents.
- `monorepo`: adds topic-specific workspace dependency boundaries, package ownership/handoff, release coordination/recovery, checklist, validation, and agent-skill documents.

`--repo-type` defaults to `generic`, so existing commands keep the same scaffold shape unless a repository type is explicitly selected.

## Addons

Use `--addon` when one repository needs extra repository-shape surfaces beyond its primary type.

```sh
ssealed init --scope general --repo-type cli-tool --addon github-action --addon docs-site
```

Addons may be any repository type except `generic`. They are recorded in `.ssealed/manifest.json` as `addons` and are compared by `update`; use `upgrade` to change them intentionally.
On `upgrade`, repeated `--addon` values replace the existing addon list. Use `--clear-addons` to remove every addon while preserving its files as retired project documents. The two options cannot be combined.

## Density Matrix

- `minimal`: creates the core agent, documentation, checklist, validation, hygiene, and selected scope/repository-type essentials.
- `standard`: default behavior. Adds the normal operating, engineering, API, UI, diagram, and validation surfaces.
- `strict`: adds deeper risk, release-readiness, service-level, data-integrity, migration, package-surface, and repository-type-specific hardening surfaces.

Use `minimal` for small repos that need a compact starting point, `standard` for normal teams, and `strict` when the repository needs stronger operational, security, or release review coverage.
Minimal backend documents keep undecided error-response policy in the documents that exist, rather than referring to a policy file generated only at higher densities. Strict threat-model, data-integrity, disaster-recovery, and service-level documents contain their own decision prompts. CLI configuration, command, output, and shell-completion documents likewise contain topic-specific decisions, with shared repository guidance in the CLI README. These prompts remain unconfigured scaffolds, not completed project decisions.

Generated agent route maps, checklist routers, and source-of-truth summaries only reference files included by the selected scope, repository type, addons, and density.

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

Before each write, `ssealed` rechecks that the target file still matches the state used to create the plan. New files are published with an exclusive same-directory link, so a file that appears after planning is not replaced. Existing files are rechecked after staging and retain their POSIX mode, but Node's path-based replacement APIs cannot provide strict compare-and-swap semantics against a non-cooperating writer or a hostile parent-directory swap on every platform.
Rollback records each published file's device and inode identity from its owned staging file. It verifies that identity and the written content, and rechecks the path and identity before deleting a new file, staging an old file's restoration, and publishing that restoration after its final content check. A detected replacement is preserved even when its bytes match the generated content; the original failure and incomplete recovery are reported together. These checks retain the path-based race limitations described above.
Temporary files are created exclusively, and failure cleanup removes them only after this write successfully created them. A temporary-path collision preserves the existing file and reports the creation failure. Open handles are closed before cleanup, and cleanup failures retain the original write error.
Failed scaffold runs remove only empty directories they created exclusively. A directory created by another writer is not claimed for cleanup. Created directories record device and inode identity and are checked for links and replacement before removal, with children cleaned before parents. Replaced or unverifiable directories are preserved and reported as incomplete recovery alongside the original failure. Pre-existing directories and the selected target root are retained. These path and identity checks have the same best-effort race limits as file writes.

## Manifest Behavior

Every write run refreshes `.ssealed/manifest.json` with a schema version, generator version, generation timestamp, scope, profile, addons, density, runner, file paths, kinds, ownership, presence, lifecycle status, and SHA-256 checksums of normalized LF content. The legacy `version` field remains a generator-version alias for older clients; compatibility decisions use `generatorVersion` when present. The `profile` field is retained for manifest compatibility and represents the selected primary repository type.

Manifest loading rejects unsafe or reserved file paths, duplicate file paths, and checksum fields that are not lowercase `sha256:` values with 64 hexadecimal digits. Path uniqueness and reserved metadata checks ignore letter case on every platform so a manifest cannot record aliases such as `README.md` and `readme.md`, or `.ssealed/MANIFEST.JSON`. Accepted paths retain their original spelling. Invalid manifests are reported as `INVALID_MANIFEST` before their entries reach planning or doctor checks.
An addon must differ from the primary repository type, both in CLI options and in recorded manifest settings. A manifest that repeats its primary type as an addon is invalid and must be repaired before commands use it.
The manifest itself must be a regular file no larger than 1 MiB. Directories and other non-regular entries at `.ssealed/manifest.json` are rejected before reading or parsing their contents. The byte limit is checked again after reading. Before accepting ownership metadata, ssealed rechecks the path, device and inode identity, size, and modification and change timestamps. A detected replacement, concurrent edit, or disappearance is reported as an invalid manifest and asks the caller to retry; a detected symlink or junction is a path-safety error. These read consistency checks retain the best-effort filesystem race limitations described above.
Scaffold planning also compares the manifest's current bytes with the source used for ownership decisions. A changed manifest, including one that appeared after an initially missing manifest was checked, causes a conflict before any scaffold files are written. Runner ejection edits that validated source directly and compares the same bytes again before publication; it never adopts an unvalidated reread as its editing baseline. These guards preserve detected concurrent edits, including incompatible schema or unsafe path changes, even with `--force`.
JSON files may begin with a single UTF-8 byte order mark (BOM), including `package.json`, manifests, and lock metadata. Malformed JSON is still rejected. Package merges, manifest updates, and runner ejection preserve an existing BOM; generated JSON without a BOM stays BOM-free.
Existing scaffold files must contain valid UTF-8. Invalid byte sequences produce a planning conflict, including with `--force`, before any scaffold writes; convert legacy encodings explicitly first. Invalid UTF-8 manifests return `INVALID_MANIFEST`, and `doctor` reports invalid UTF-8 file contents as unreadable. This prevents merges from silently replacing original bytes with replacement characters.
If a recorded path differs only in letter case from a generated path, `update` and `upgrade` report a conflict before planning file reads or writing any files. Repair the recorded casing first. This prevents duplicate manifest entries and avoids guessing whether differently cased names refer to the same file on the current filesystem.
`update`, `upgrade`, `eject`, and `doctor` distinguish an absent manifest (`MISSING_MANIFEST`) from an invalid one (`INVALID_MANIFEST`) in their JSON error envelopes. Invalid manifests must be repaired or removed; these commands do not replace them, including during dry runs.

- Missing `schemaVersion` is treated as the legacy schema. `schemaVersion: 1` is the current schema.
- Unknown future schema versions fail closed as `INVALID_MANIFEST`; ssealed never guesses how to interpret them.
- `generatorVersion` controls generator-specific compatibility behavior. Legacy manifests fall back to `version`.
- `eject` changes only the selected ownership record and preserves schema and generator compatibility metadata.
- Runner ejection edits the package record's ownership, lifecycle, and checksum fields plus the manifest update timestamp. Other records and extension metadata retain their original JSON tokens, whitespace, line endings, and BOM. All occurrences of `managedScripts` are removed from the ejected record so an earlier duplicate cannot regain ownership.
- Before transferring a managed package runner, `eject` requires an existing `package.json` to be a regular UTF-8 file. Invalid encoding or non-regular entries return `INVALID_PACKAGE_FILE`, including in dry runs, without changing ownership. A missing optional package may still be ejected. Before publishing the ownership change, ejection rechecks package contents or absence and the manifest source, and rechecks their paths after reads. A detected package change, deletion, or appearance returns `WRITE_FAILED` and preserves the previous ownership record. These checks have the same best-effort filesystem race limits as scaffold writes.

Manifest file ownership has four meanings:

- `seeded`: ssealed created an initial document or repository file, but the project is expected to edit, move, or delete it over time.
- `block-managed`: ssealed manages a bounded block or script set inside a user-owned file, such as `.gitignore` or generated validation scripts in `package.json`.
- `project-owned`: the project explicitly owns the file or surface, such as an adopted existing file or an ejected package runner block.
- `managed`: ssealed owns the full file content as tool metadata.

For npm and pnpm runners, each `package.json` manifest entry also records `managedScripts`: only the validation scripts actually supplied by ssealed. Pre-existing user scripts remain outside that set. `update` restores a deleted managed script but refuses to replace one whose value was edited. Legacy entries without `managedScripts` remain readable and gain the field on an accepted update.
Merging runner scripts preserves existing tab or space indentation and keeps compact, single-line package files compact. When no validation script changes are needed, `package.json` is preserved byte for byte, including custom spacing, line layout, and line endings, even with `--force`. The manifest still accepts its current normalized checksum without rewriting the package file.
When script changes are needed, only supplied validation script values are inserted or replaced. Other package fields and user script values retain their original JSON tokens, including large integers, long decimals, exponent notation, key spelling, and string escapes. Writes still normalize line endings to LF. The JSON is validated before any token edits; duplicate property names retain the last-value semantics used by `JSON.parse`.

Seeded files use `presence: optional`; missing seeded files can be retained as `status: retired`. Active files keep `initialChecksum`, `generatedChecksum`, and `acceptedChecksum` so tooling can distinguish original template content, the last generated scaffold content, and project-accepted content. The legacy `checksum` field remains as the accepted checksum for compatibility.

The manifest helps identify previously generated files, but it never authorizes silent overwrite of user-modified files. Default `doctor` treats modified seeded files as `customized`, missing optional seeded files as `retired`, and explicitly ejected files as `project-owned`; these are healthy lifecycle states. `doctor --strict` still accepts `project-owned` files because ssealed no longer owns that surface.

`init` and `adopt` are intentionally conservative and refuse a target that already has a valid `.ssealed/manifest.json`. Use `adopt` for an existing repository that should gain scaffold metadata without handing existing files to ssealed. Use `update` to reapply the recorded scaffold settings, or use `upgrade` to explicitly change `scope`, repository type, addons, `density`, or `runner`. `update` rejects setting changes so old generated files do not silently become untracked scaffold leftovers, but it does not force project documents back to their seed text.

## Path Safety

Template paths must be relative, normalized, and contained by the selected target directory.

`ssealed` rejects absolute paths, parent traversal, Windows reserved names, unsafe path characters (including control characters), and `bunfig.toml` generation. Ordinary names containing dots, such as `..notes.md`, remain valid inside the target. Scaffold writes refuse symlinked generated directories and symlinked existing files instead of following them outside the target.
Portable path checks include the superscript device names `COM¹`, `COM²`, `COM³`, `LPT¹`, `LPT²`, and `LPT³` defined by [Microsoft's Windows naming rules](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file). These names are rejected in any path segment, including with extensions, on every platform. Ordinary Unicode filenames are preserved without normalization.
All commands reject a symlink or Windows junction selected as the target directory itself, including `doctor` and dry runs. Select the real directory instead.
Scaffold planning checks each generated file's parent directories before reading existing content. Linked generated directories are rejected during dry runs and even when every file would otherwise be unchanged or customized.
Paths are checked again after staging, immediately before publication, and before rolling back each written file. If rollback detects a symlink or junction introduced during the write, it skips that file and reports incomplete recovery, preserving files behind the link. These path checks remain best effort; they do not eliminate the path-based API race described above.
`eject runner` also rechecks the manifest path for symlinks and junctions immediately before publishing the ownership change, before comparing the manifest contents.
Atomic writes record the exclusively opened temporary file's device and inode identity. Publication and cleanup recheck that identity and preserve a detected replacement, even if its contents match. Permission changes use the opened handle. If cleanup cannot verify ownership, the error includes both the write failure and cleanup failure; the temporary file is left for inspection. These identity checks also remain best effort against concurrent path changes.

Commands use `.ssealed-init.lock` to keep reads and writes for the same existing target mutually exclusive. If a previous process crashed and left an old lock, rerun a write command with `--break-stale-lock`; the lock is removed only when its metadata is old enough and the recorded local process is confirmed absent. Lock metadata must be valid UTF-8 JSON in a regular file no larger than 1 MiB, identify `tool: ssealed`, and contain a positive integer process ID and a valid creation timestamp. Present `hostname` and `lockId` fields must be nonempty strings; malformed fields are not treated as missing legacy fields. Foreign or malformed locks, locks recorded on another host, and locks whose process status cannot be checked are preserved. Valid legacy locks without a hostname or lock ID remain supported; an absent hostname uses the local process check.
Stale recovery acquires `.ssealed-recovery.lock` exclusively, then rereads the main lock and holds the recovery lock through main-lock reacquisition. It releases the recovery lock before entering the command's write section, preventing another recovery caller from deleting a newly acquired main lock. If a crash leaves the recovery lock behind, ssealed refuses automatic removal: verify no recovery process is running before manually removing that file and retrying. Both lock paths are reserved and ignored by generated projects.
Normal release and stale recovery recheck the lock path and its device and inode identity after reading metadata, before removal. Recovery captures the identity before reading stale metadata. Detected replacements are preserved even when their metadata is identical, and a symlink or junction introduced at the target path prevents lock removal and reacquisition through that link. These checks remain best effort against changes between the final check and filesystem operation.
If writing lock metadata fails, cleanup verifies the exclusively opened file's device and inode identity instead of requiring complete JSON. A verified partial lock is removed so a normal retry can proceed; replacements and locks whose identity cannot be verified are preserved. Errors retain the original write failure and any cleanup failures. JSON aggregate errors expose nested `causes` so manifest publication, rollback, and lock-release failures are not hidden by the last cleanup error.

`doctor` and `--dry-run` hold the same target lock for their full read so a writer cannot create a mixed in-progress scaffold state. A dry run against a missing target still creates no directory; if that target appears concurrently, the stale read is discarded and the command asks the caller to retry.

Scaffold writes run in bounded parallel batches for regular files, then write `.ssealed/manifest.json` last. If any batched write fails, rollback is attempted before the lock is released. `SIGINT` and `SIGTERM` stop new batches and trigger the same recovery for partial writes. If all writes already completed before a signal arrives during lock release, the changes remain on disk.
Command results are printed only after lock cleanup completes. JSON interruption and lock-cleanup errors include `committed`, indicating whether the command completed its writes; `false` does not guarantee successful recovery of partial writes. Recovery errors report any incomplete cleanup. A signal during lock release returns 130 or 143 with one JSON error and the actual committed state, without first printing success or claiming that completed writes were rolled back.
If multiple files fail within a batch, ssealed reports every failed path and preserves all original errors in an `AggregateError`. A single failure retains its original error.
When restoring an overwritten file, rollback rechecks its path and identity before staging the original bytes. After staging, it checks the generated content and then rechecks the path and identity before restoration. If a parent has become a symlink or junction, even one pointing to the relocated original file with the same identity, rollback skips deletion or restoration and reports incomplete recovery.
Bounded reads finish already started operations before reporting the first failure. Lock cleanup never turns a failed operation into success; if cleanup also fails, both failures are retained.

The generated `.gitignore` block includes `.ssealed-init.lock` and `.ssealed-recovery.lock` so stale lock metadata is not committed accidentally. `doctor` accepts blocks from before each lock pattern was introduced when the manifest records the corresponding older generator version. Use `update --force` to refresh an unmodified older managed block.

`doctor` validates block-managed surfaces even when the whole-file checksum matches the manifest, so an `update` cannot accept modified package scripts or malformed `.gitignore` blocks as healthy state. Project-owned ignore rules may live outside the single ssealed block. Manifests generated before `.ssealed-init.lock` was added to the managed block remain accepted for compatibility. For npm and pnpm runners, use `ssealed eject runner [target]` before replacing generated validation scripts with project-owned package scripts; doctor then reports `package.json` as `project-owned` instead of `block-modified`.

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
ssealed eject runner ./my-service --dry-run --json
```

`--json` disables interactive prompts, including when run in a terminal. Pass `--scope` explicitly for `init` and `adopt`; a missing scope returns a `MISSING_SCOPE` JSON error. It prints a public result shape with command, target, scope, profile, repoType, addons, density, runner, file paths, kinds, ownership, presence, actions, lifecycle statuses, reasons, conflicts, warnings, and written paths. Runtime failures also return `{ "ok": false, "error": { "code": "...", "message": "..." } }`. JSON output does not include generated file contents or existing file contents.
`--` ends option parsing. A following token such as `--json` is a positional value and does not enable JSON error output. Argument parsing failures in human mode are written to stderr and return exit code 1.

## Why `.agents/skills`

Generated repositories use `.agents/skills/.../SKILL.md` because repo-scoped agent skills are expected to live under `.agents/skills`. Each generated skill includes `name` and `description` frontmatter.

## Why No Generated Bun Runner in v1

The `ssealed` CLI itself supports Bun execution. That is separate from generated scaffold runner support.

`bunfig.toml` and `--runner bun` are intentionally not generated in v1. Bun runner support should be added later only with explicit runner design, documentation, and tests.
