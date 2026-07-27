import { ErrorCode } from "@/shared/errors/ErrorCodes";
import { UnauthorizedError } from "@/shared/errors/UnauthorizedError";
import { ApiResponse } from "@/shared/types/apiResponse";
import { Request, Response, NextFunction } from "express"
import jwt, { JwtPayload } from 'jsonwebtoken'
import 'dotenv/config'

export async function authenticate(
    req: Request,
    res: Response<ApiResponse<null>>,
    next: NextFunction
) {
    const token = req.cookies.accessToken

    if(!token){
        return next(new UnauthorizedError('Token não informado', ErrorCode.UNAUTHORIZED_USER))
    }

    try{
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload
        req.user = payload.sub
        next()
    }catch{
        next(new UnauthorizedError('Token não autorizado', ErrorCode.UNAUTHORIZED_USER))
    }
}