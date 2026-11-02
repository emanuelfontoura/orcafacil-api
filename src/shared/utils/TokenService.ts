import { z } from 'zod'
import jwt from 'jsonwebtoken'

interface TokenServiceConfig{
    acessSecret: string,
    refreshSecret: string
}

interface AcessTokenData{
    userId: string
}
const AcessPayloadSchema = z.object({sub: z.string()})

interface RefreshTokenData extends AcessTokenData{}
const RefreshPayloadSchema = z.object({sub: z.string()})

const ALGORITHM = 'HS256';

export class TokenService{
    constructor(private readonly config: TokenServiceConfig) {}

    verifyAcessToken(token: string): AcessTokenData | null{
        const payload = this.decode(token, this.config.acessSecret, AcessPayloadSchema)
        return payload && {userId: payload.sub}
    }

    verifyRefreshToken(token: string): RefreshTokenData | null{
        const payload = this.decode(token, this.config.refreshSecret, RefreshPayloadSchema)
        return payload && {userId: payload.sub}
    }

    private decode<T>(token: string, secret: string, schema: z.ZodType<T>): T | null{
        try{
            const payload = jwt.verify(token, secret, {algorithms: [ALGORITHM]})
            const result = schema.safeParse(payload)
            return result.success ? result.data : null
        }catch{
            return null
        }
    }
}