import type { TopicContract } from "./contract.js";

export const cliToolTopics: Readonly<Record<string, TopicContract>> = {
  "docs/cli/command-contract.md": {
    purpose: "Specify each command's inputs, side effects, cancellation, and compatibility independently of its implementation.",
    source: "docs/cli/README.md",
    decisions: [
      "Command purpose and side effects: UNDECIDED. State what success changes and what requires confirmation.",
      "Argument grammar: UNDECIDED. Define positional arguments, flags, defaults, aliases, and incompatible options.",
      "Path and working-directory rules: UNDECIDED. Specify target resolution and overwrite boundaries.",
      "Dry-run, retry, and cancellation: UNDECIDED. Define repeatability and recovery after partial work.",
      "Compatibility and deprecation: UNDECIDED. Identify observable changes and migration guidance.",
    ],
  },
  "docs/cli/configuration.md": {
    purpose: "Define how a command obtains, validates, and explains its effective configuration.",
    source: "docs/cli/README.md",
    decisions: [
      "Configuration sources: UNDECIDED. List supported files, environment variables, and command flags.",
      "Configuration precedence: UNDECIDED. Define the order of defaults, files, environment, and flags.",
      "Missing, empty, and invalid values: UNDECIDED. Specify defaults and failure behavior separately.",
      "Validation and unknown keys: UNDECIDED. Identify accepted types and diagnostics.",
      "Effective-config output: UNDECIDED. Explain selected sources without exposing secrets.",
    ],
  },
  "docs/cli/output-and-exit-codes.md": {
    purpose: "Keep terminal and machine-readable results consistent with the actual command outcome.",
    source: "docs/cli/README.md",
    decisions: [
      "Output schema: UNDECIDED. Define JSON fields, versioning, and single-result framing.",
      "stdout and stderr: UNDECIDED. Separate machine-readable results, diagnostics, progress, and prompts.",
      "Exit-code taxonomy: UNDECIDED. Distinguish success, validation failure, conflict, and interruption.",
      "Completion boundary: UNDECIDED. Specify when writes, recovery, and cleanup permit a success report.",
      "Partial failure details: UNDECIDED. Preserve original causes and accurately report remaining changes.",
    ],
  },
  "docs/cli/shell-completion.md": {
    purpose: "Define discoverable shell integration without executing command side effects during completion.",
    source: "docs/cli/README.md",
    decisions: [
      "Supported shells: UNDECIDED. Identify versions and installation or removal steps.",
      "Completion sources: UNDECIDED. Specify commands, flags, enum values, and file candidates.",
      "Quoting and escaping: UNDECIDED. Cover spaces, Unicode, metacharacters, and platform paths.",
      "Completion side effects: UNDECIDED. Define read-only behavior and bounded execution cost.",
      "Compatibility checks: UNDECIDED. Verify generated completions against the command grammar.",
    ],
  },
};
