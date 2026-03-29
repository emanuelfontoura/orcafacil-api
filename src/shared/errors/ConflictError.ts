import { AppError } from "./AppError";
import { ErrorCode } from "./ErrorCodes";

export class ConflictError extends AppError{
    constructor(message = 'Recurso já existe ou está em conflito', code?:ErrorCode){
        super(message, 409, code)
    }
}