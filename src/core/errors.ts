export type SsealedErrorCode = "FILESYSTEM_ERROR" | "LOCK_EXISTS" | "PATH_SAFETY_ERROR" | "WRITE_FAILED";

export class SsealedError extends Error {
  readonly code: SsealedErrorCode;

  constructor(code: SsealedErrorCode, message: string) {
    super(message);
    this.name = "SsealedError";
    this.code = code;
  }
}

export function isSsealedError(error: unknown): error is SsealedError {
  return error instanceof SsealedError;
}
