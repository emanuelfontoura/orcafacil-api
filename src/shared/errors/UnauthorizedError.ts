import { AppError } from "@/shared/errors/AppError";
import { ErrorCode } from "@/shared/errors/ErrorCodes"

export class UnauthorizedError extends AppError{
    constructor(message = 'Não autorizado', code?: ErrorCode){
        super(message, 401, code)
    }
}