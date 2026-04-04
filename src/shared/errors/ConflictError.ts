import { AppError } from "@/shared/errors/AppError";
import { ErrorCode } from "@/shared/errors/ErrorCodes"

export class ConflictError extends AppError{
    constructor(message = 'Recurso já existe ou está em conflito', code?:ErrorCode){
        super(message, 409, code)
    }
}