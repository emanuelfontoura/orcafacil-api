import { AppError } from "@/shared/errors/AppError";
import { ErrorCode } from "@/shared/errors/ErrorCodes"

export class NotFoundError extends AppError{
    constructor(message = 'Recurso não encontrado', code: ErrorCode = ErrorCode.NOT_FOUND, details?: unknown){
        super(message, 404, code, details)
    }
}