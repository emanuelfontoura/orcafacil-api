import { AuthDTOs } from "@/modules/auth/auth.dtos";
import jwt from "jsonwebtoken"
import { AppError } from "@/shared/errors/AppError";
import { ErrorCode } from "@/shared/errors/ErrorCodes";

export async function generateTokens(userId: number, jti: string): Promise<AuthDTOs['TokensDTO']> {
    let accessToken, refreshToken: string
    try{
        accessToken = jwt.sign(
            {sub: userId},
            process.env.JWT_ACCESS_SECRET!,
            {expiresIn: "15m"}
        )
        refreshToken = jwt.sign(
            {sub: userId, jti},
            process.env.JWT_REFRESH_SECRET!,
            {expiresIn: "7d"}
        )
    }catch{
        throw new AppError('Erro ao gerar tokens.', 500, ErrorCode.INTERNAL_SERVER_ERROR)
    }

    return {accessToken, refreshToken}
}