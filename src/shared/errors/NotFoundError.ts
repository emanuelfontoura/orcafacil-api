import { AppError } from "@/shared/errors/AppError";
import { ErrorCode } from "@/shared/errors/ErrorCodes"

export class NotFoundError extends AppError{
    constructor(message = 'Recurso não encontrado', code?:ErrorCode){
        super(message, 404, code)
    }
}