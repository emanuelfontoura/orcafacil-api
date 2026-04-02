import { Request, Response, NextFunction } from "express"
import { redis } from "../lib/redis"
import { AppError } from "../shared/errors/AppError"
import { ErrorCode } from "../shared/errors/ErrorCodes"

export const rateLimit = (maxReqLimit: number, maxTimeLimit: number, route: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || req.ip
        const key = `rate-limit-${route}-${ip}`
        const dataRateLimitPromise = await redis.get(key) || 0
        const requests = Number(dataRateLimitPromise)
        if(requests === 1){
            await redis.expire(key, maxTimeLimit)
        }
        if(requests > maxReqLimit){
            return next(new AppError('Limite de requisições excedido', 429, ErrorCode.RATE_LIMIT_EXCEEDED))
        }
        await redis.set(key, requests + 1, "EX", maxTimeLimit)
        next()
    }
}