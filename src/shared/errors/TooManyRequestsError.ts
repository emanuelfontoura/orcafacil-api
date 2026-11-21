import { AppError } from "./AppError";
import { ErrorCode } from "./ErrorCodes";

export class TooManyRequestsError extends AppError {
  constructor(
    message = 'Muitas requisições. Tente novamente em instantes.',
    code: ErrorCode = ErrorCode.TOO_MANY_REQUESTS,
    details?: unknown,
  ) {
    super(message, 429, code, details);
  }
}
