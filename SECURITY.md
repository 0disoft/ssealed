# Security Policy

## Reporting a Vulnerability

Do not report security vulnerabilities through a public issue.

Use the private security contact for this project when one is configured:

`REPLACE_WITH_SECURITY_CONTACT`

If no private contact is configured, open a public issue only to ask for the
preferred private reporting channel. Do not include exploit details, secrets,
tokens, private repository paths, or personally identifiable information in the
public issue.

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
