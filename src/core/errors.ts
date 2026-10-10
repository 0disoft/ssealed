export type SsealedErrorCode = "FILESYSTEM_ERROR" | "INTERRUPTED" | "LOCK_EXISTS" | "PATH_SAFETY_ERROR" | "WRITE_FAILED";
export type ScaffoldSignalName = "SIGINT" | "SIGTERM";

export class SsealedError extends Error {
  readonly code: SsealedErrorCode;

  constructor(code: SsealedErrorCode, message: string) {
    super(message);
    this.name = "SsealedError";
    this.code = code;
  }
}

export class ScaffoldInterruptedError extends SsealedError {
  readonly signal: ScaffoldSignalName;
  readonly exitCode: number;
  readonly committed: boolean;

  constructor(signal: ScaffoldSignalName, committed = false) {
    super("INTERRUPTED", committed
      ? `Interrupted by ${signal} after scaffold changes were committed; the changes remain on disk.`
      : `Interrupted by ${signal}; scaffold changes were not committed. Inspect any recovery errors before retrying.`);
    this.name = "ScaffoldInterruptedError";
    this.signal = signal;
    this.exitCode = signal === "SIGINT" ? 130 : 143;
    this.committed = committed;
  }
}

export class ScaffoldCleanupError extends AggregateError {
  constructor(errors: readonly unknown[], message: string, readonly committed: boolean) {
    super(errors, message);
    this.name = "ScaffoldCleanupError";
  }
}

export function isSsealedError(error: unknown): error is SsealedError {
  return error instanceof SsealedError;
}

export function isScaffoldInterruptedError(error: unknown): error is ScaffoldInterruptedError {
  return error instanceof ScaffoldInterruptedError;
}
