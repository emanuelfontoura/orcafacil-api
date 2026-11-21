import { AppError } from "./AppError";
import { ErrorCode } from "./ErrorCodes";

export class BadRequestError extends AppError{
    constructor(message: string = 'Requisição inválida', code: ErrorCode = ErrorCode.BAD_REQUEST, details?: unknown){
        super(message, 400, code, details)
    }
}