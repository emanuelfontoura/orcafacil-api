import { AppError } from "@/shared/errors/AppError";
import { ErrorCode } from "@/shared/errors/ErrorCodes"

export class ForbiddenError extends AppError{
    constructor(message = 'Acesse negado', code: ErrorCode = ErrorCode.FORBIDDEN, details?: unknown){
        super(message, 403, code, details)
    }
}