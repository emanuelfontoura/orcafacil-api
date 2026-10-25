import { Request, Response, NextFunction, RequestHandler } from "express"
import { AppError } from "@/shared/errors/AppError"
import { ErrorCode } from "@/shared/errors/ErrorCodes"
import Redis from "ioredis"

interface RateLimitOptions {
    maxReqLimit: number,
    maxTimeLimit: number,
    route: string
}

export type RateLimit = (options: RateLimitOptions) => RequestHandler

export function createRateLimit(redis: Redis): RateLimit{
    return ({maxReqLimit, maxTimeLimit, route}) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || req.ip
            const key = `rate-limit-${route}-${ip}`
            const requests = await redis.incr(key)
            if(requests === 1){
                await redis.expire(key, maxTimeLimit)
            }
            if(requests > maxReqLimit){
                return next(new AppError('Limite de requisições excedido', 429, ErrorCode.RATE_LIMIT_EXCEEDED))
            }
            next()
        }
    }
}