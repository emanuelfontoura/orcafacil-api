import { AuthDTOs } from "@/modules/auth/auth.dtos";
import jwt from "jsonwebtoken"
import { randomUUID } from "crypto";
import { redis } from "@/lib/redis";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCode } from "@/shared/errors/ErrorCodes";
import { env } from "@/config/env";

export async function generateTokens(userId: number): Promise<AuthDTOs['TokensDTO']> {
    let accessToken, refreshToken: string
    try{
        accessToken = jwt.sign(
            {sub: userId},
            env.JWT_ACCESS_SECRET,
            {expiresIn: "15m"}
        )
        const jti = randomUUID()
        refreshToken = jwt.sign(
            {sub: userId, jti},
            env.JWT_REFRESH_SECRET,
            {expiresIn: "7d"}
        )
        await redis.set(
            `refresh-token-${jti}`,
            userId,
            "EX",
            604800
        )
    }catch(error){
        throw new AppError('Erro ao gerar tokens.', 500, ErrorCode.INTERNAL_SERVER_ERROR)
    }

    return {accessToken, refreshToken}
}