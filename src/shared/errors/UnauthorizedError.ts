import { AppError } from "./AppError";
import { ErrorCode } from "./ErrorCodes";

export class UnauthorizedError extends AppError{
    constructor(message = 'Não autorizado', code?: ErrorCode){
        super(message, 401, code)
    }
}