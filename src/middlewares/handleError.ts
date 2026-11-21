import { unknown, ZodError } from "zod"
import { AppError } from "@/shared/errors/AppError"
import { Request, Response, NextFunction } from "express"
import { ApiFailure, ApiResponse } from "@/shared/types/ApiResponse"
import { ErrorCode } from "@/shared/errors/ErrorCodes"
import { Prisma } from "@prisma/client"
import { ConflictError } from "@/shared/errors/ConflictError"
import { NotFoundError } from "@/shared/errors/NotFoundError"
import { BadRequestError } from "@/shared/errors/BadRequestError"

function isBodyParserError(error: unknown, type: string){
    return typeof error === 'object' && error !== null && 'type' in error && error.type === type
}

function isClientBodyError(error: unknown) {
  if (typeof error !== 'object' || error === null) return false;
  const { status, expose } = error as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && status >= 400 && status < 500 && expose === true;
}

function formatZodIssues(error: ZodError){
    return error.issues.map(issue => {
        return {
            field: issue.path.join('.'),
            message: issue.message
        }
    })
}

function fromLibraryError(error: unknown): AppError | null{
    if(error instanceof Prisma.PrismaClientKnownRequestError){
        if(error.code === 'P2002') return new ConflictError()
        if(error.code === 'P2025') return new NotFoundError()
    }

    if(error instanceof ZodError){
        return new BadRequestError('Dados inválidos', ErrorCode.ZOD_VALIDATION, formatZodIssues(error))
    }

    if(isBodyParserError(error, 'entity.parse.failed')){
        return new BadRequestError('JSON malformado', ErrorCode.INVALID_JSON)
    }

    if(isBodyParserError(error, 'entity.too.large')){
        return new AppError('Corpo da requisição muito grande', 413, ErrorCode.PAYLOAD_TOO_LARGE)
    }

    if(isBodyParserError(error, 'charset.unsupported') || isBodyParserError(error, 'encoding.unsupported')){
        return new AppError('Codificação do corpo não suportada: envie JSON em UTF-8.', 415, ErrorCode.UNSUPPORTED_MEDIA_TYPE)
    }

    if(error instanceof URIError && (error as {status?: unknown}).status === 400){
        return new BadRequestError('Caminho da requisição inválido', ErrorCode.INVALID_PATH)
    }

    if(isClientBodyError(error)) {
        return new BadRequestError('Corpo da requisição inválido.', ErrorCode.INVALID_BODY);
    }

    return null
}

export function handleError(
    error: any,
    req: Request,
    res: Response<ApiResponse<null>>,
    next: NextFunction
){
    const appError = error instanceof AppError ? error : fromLibraryError(error)

    if(!appError){
        const body: ApiFailure = {
            success: false,
            error: {
                code: ErrorCode.INTERNAL,
                message: 'Erro interno do servidor'
            }
        }
        res.status(500).json(body)
        return
    }

    const body: ApiFailure = {
        success: false,
        error: {
            code: appError.code,
            message: appError.message
        }
    }
    if(appError.details !== undefined) body.error.details = appError.details
    res.status(appError.statusCode).json(body)
}