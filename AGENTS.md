# AGENTS.md

## Repository Scope

This repository contains the `ssealed` TypeScript CLI package.

The package generates repository design scaffolds: documentation, agent instructions,
validation routers, checklists, diagrams, GitHub templates, hygiene files, and optional
task runner entrypoints.

It must not generate application source code, web apps, services, databases, or runtime
infrastructure.

## Development Rules

- Use Bun for repository development commands and the lockfile.
- Keep the published CLI compatible with Node.js 24+ and Bun 1.3+ runtime execution.
- Prefer Node built-ins over runtime dependencies.
- Do not add React, Next.js, server frameworks, databases, or web UI.
- Keep generated scaffold runner support separate from CLI runtime support.
- Do not generate `bunfig.toml` or accept `--runner bun` until Bun runner behavior has
  explicit design, documentation, and tests.
- Preserve path-safety checks for all generated files.
- Preserve non-overwrite behavior unless `--force` is explicitly provided.
- Keep manifest checksums stable over normalized LF content.

## Required Checks

Before reporting a code or packaging change as complete, run:

- `bun run check`
- `npm pack --dry-run --json` for package-surface changes

For runtime support changes, also verify:

- `node dist/cli.js --version`
- `bun dist/cli.js --version`
- `bun run smoke:node-runtime`
- `bun run smoke:bun-runtime`

## Release Notes

Version source of truth is split between:

- `package.json`
- `src/core/manifest.ts`

Keep both synchronized.
