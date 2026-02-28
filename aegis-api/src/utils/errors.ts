/**
 * AppError — Typed error class for API error responses.
 * Ensures consistent error shape: { error: string, code: string, statusCode: number }
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function badRequest(message: string, code = 'BAD_REQUEST'): AppError {
  return new AppError(message, code, 400);
}

export function unauthorized(message: string, code = 'UNAUTHORIZED'): AppError {
  return new AppError(message, code, 401);
}

export function forbidden(message: string, code = 'FORBIDDEN'): AppError {
  return new AppError(message, code, 403);
}

export function notFound(message: string, code = 'NOT_FOUND'): AppError {
  return new AppError(message, code, 404);
}

export function conflict(message: string, code = 'CONFLICT'): AppError {
  return new AppError(message, code, 409);
}

export function locked(message: string, code = 'ACCOUNT_LOCKED'): AppError {
  return new AppError(message, code, 423);
}
