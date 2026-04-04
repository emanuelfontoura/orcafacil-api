import { ZodError } from "zod"
import { AppError } from "@/shared/errors/AppError"
import { Request, Response, NextFunction } from "express"
import { ApiResponse } from "@/shared/types/apiResponse"

export function handleError(
    error: any,
    req: Request,
    res: Response<ApiResponse<null>>,
    next: NextFunction
){
    if(error instanceof ZodError){
        return res.status(400).json({
            success: false,
            error: 'Erro de validação',
            details: error.issues.map(issue => {
                return {
                    field: issue.path.join('.'),
                    message: issue.message
                }
            })
        })
    }

    if(error instanceof AppError){
        return res.status(error.statusCode).json({
            success: false,
            error: error.message,
            code: error.code
        })
    }

    return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
    })
}