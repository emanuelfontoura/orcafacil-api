import { UnauthorizedError } from "@/shared/errors/UnauthorizedError";
import { Request, Response, NextFunction } from "express"
import { TokenService } from "@/shared/utils/TokenService";
import 'dotenv/config'

export function createAuthenticate(tokenService: TokenService) {
    return (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies.accessToken

        if(!token) throw new UnauthorizedError()

        try{
            const auth = token ? tokenService.verifyAcessToken(token) : null
            if (!auth) throw new UnauthorizedError()
            req.user = auth.userId
            next()
        }catch{
            throw new UnauthorizedError()
        }
    }
}