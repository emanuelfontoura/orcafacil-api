import { ErrorCode } from "@/shared/errors/ErrorCodes"

export class AppError extends Error{
    readonly statusCode: number
    readonly code: string
    readonly details?: unknown

    constructor(message: string, statusCode: number, code: ErrorCode, details?: unknown){
        super(message)
        this.name = new.target.name
        this.statusCode = statusCode
        this.code = code
        if(details !== undefined) this.details = details
    }
}