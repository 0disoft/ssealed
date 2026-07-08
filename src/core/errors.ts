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

  constructor(signal: ScaffoldSignalName) {
    super("INTERRUPTED", `Interrupted by ${signal}; rolled back partial scaffold writes and released the scaffold lock.`);
    this.name = "ScaffoldInterruptedError";
    this.signal = signal;
    this.exitCode = signal === "SIGINT" ? 130 : 143;
  }
}

export function isSsealedError(error: unknown): error is SsealedError {
  return error instanceof SsealedError;
}

export function isScaffoldInterruptedError(error: unknown): error is ScaffoldInterruptedError {
  return error instanceof ScaffoldInterruptedError;
}
