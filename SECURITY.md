# Security Policy

## Reporting a Vulnerability

Do not report security vulnerabilities through a public issue.

Report vulnerabilities through GitHub's private vulnerability reporting:

[Open a private vulnerability report](https://github.com/0disoft/ssealed/security/advisories/new)

Do not include exploit details, secrets, tokens, private repository paths, or
personally identifiable information in a public issue.

## Scope

Security reports for `ssealed` should focus on:

- writing files outside the selected target directory;
- following symlinks or reparse points during scaffold writes;
- overwriting user files without explicit `--force`;
- leaking secrets into generated files;
- generating unsafe GitHub templates, validation instructions, or agent skills;
- package distribution issues that allow command hijacking.

## Supported Versions

The first production-quality implementation is pre-1.0. Security fixes are
handled on the main development line unless maintainers publish a separate
support policy.
