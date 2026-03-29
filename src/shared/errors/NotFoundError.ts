import { AppError } from "./AppError";
import { ErrorCode } from "./ErrorCodes";

export class NotFoundError extends AppError{
    constructor(message = 'Recurso não encontrado', code?:ErrorCode){
        super(message, 404, code)
    }
}