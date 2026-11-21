import { AppError } from "./AppError";
import { ErrorCode } from "./ErrorCodes";

export class ServiceUnavailableError extends AppError {
  constructor(
    message = 'Serviço temporariamente indisponível.',
    code: ErrorCode = ErrorCode.SERVICE_UNAVAILABLE,
    details?: unknown,
  ) {
    super(message, 503, code, details);
  }
}
