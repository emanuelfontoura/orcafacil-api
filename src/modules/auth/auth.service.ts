import { AuthDTOs } from '@/modules/auth/auth.dtos'
import { AuthUserRepository } from '@/modules/auth/auth.repository'
import { userRepository } from '@/modules/user/user.repository'
import { redis } from '@/lib/redis'
import { ArgonHash } from '@/shared/utils/argonHash'
import { env } from "@/config/env"
import jwt from 'jsonwebtoken'
import { ConflictError } from '@/shared/errors/ConflictError'
import { ErrorCode } from '@/shared/errors/ErrorCodes'
import { AppError } from '@/shared/errors/AppError'
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError'
import { verifyKeyExists } from '@/shared/utils/verifyKeyExists'
import { generateCode } from '@/shared/utils/generateCode'
import { generateTokens } from '@/shared/utils/generateTokens'

export class AuthUserService{

    static async verifyEmail(data: AuthDTOs['VerifyEmailRequestDTO']):Promise<AuthDTOs['VerifyEmailResponseDTO']>{
        // Email exists
        const user = await userRepository.findByEmail(data.email)
        if(user) throw new ConflictError('Esse email já está cadastrado.', ErrorCode.USER_ALREADY_EXISTS)

        // Password hash with Argon2
       const hashedPassword = await ArgonHash.argonHash(data.password)
        
        const keyExists = await verifyKeyExists(`verify-email-cooldown-${data.email}`)
        if(keyExists) throw new ConflictError('Aguarde para realizar esta ação novamente', ErrorCode.LIMIT_ATTEMPTS)

        // Save on Redis
        const code = generateCode()
        const hashedCode = await ArgonHash.argonHash(code)

        try{
            await redis.set(
                `verify-email-${data.email}`,
                JSON.stringify({
                    code: hashedCode,
                    name: data.name,
                    password: hashedPassword
                }),
                "EX",
                600
            )
        }catch(error){
            throw new AppError('Erro ao salvar código de verificação', 500, ErrorCode.REDIS_SAVE_ERROR)
        }
        
        await AuthUserRepository.sendEmailVerificationCode({email: data.email, code})

        try{
            await redis.set(
                `verify-email-cooldown-${data.email}`,
                1,
                "EX",
                60
            )
        }catch(error){
            throw new AppError('Erro ao salvar email na fila de cooldown', 500, ErrorCode.REDIS_SAVE_ERROR)
        }

        return {email: data.email, name: data.name}
    }

    static async confirmEmail(data: AuthDTOs['ConfirmEmailRequestDTO']): Promise<AuthDTOs['ConfirmEmailResponseDTO']>{
        let dataUser
        try{
            dataUser = await redis.get(`verify-email-${data.email}`) 
        }catch{
            throw new AppError('Erro ao obter dados da recuperação de senha', 500, ErrorCode.REDIS_GET_ERROR)
        }
        if(!dataUser) throw new UnauthorizedError('Código expirado ou não encontrado.', ErrorCode.EXPIRED_CODE)

        const dataParsed = JSON.parse(dataUser)

        const codeMatch = await ArgonHash.argonVerify(dataParsed.code, data.code)
        if(!codeMatch) throw new UnauthorizedError('Código inválido.', ErrorCode.INVALID_CODE)

        const user = await userRepository.createUser({
            email: data.email,
            name: dataParsed.name,
            password: dataParsed.password 
        })
        if(!user) throw new AppError('Houve um erro ao criar o usuário.', 500, ErrorCode.USER_CREATION_FAILED)

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
        }
    }

    static async resendEmailCode(data: {email: string}): Promise<{email: string}>{
        const keyCooldown = `verify-email-cooldown-${data.email}`
        const keyNewCode = `verify-email-${data.email}`

        const keyExists = await verifyKeyExists(keyCooldown)
        if(keyExists) throw new ConflictError('Aguarde para realizar esta ação novamente', ErrorCode.LIMIT_ATTEMPTS)

        const oldKey = await redis.get(keyNewCode)
        if(!oldKey) throw new ConflictError('Tempo esgotado. Registre-se novamente', ErrorCode.TIME_OUT_REGISTER)

        const parsedOldKey = JSON.parse(oldKey)

        const newCode = generateCode()

        try{
            await redis.set(
                keyNewCode,
                JSON.stringify({
                    ...parsedOldKey,
                    code: newCode,
                }),
                "EX",
                600
            )
        }catch{
            throw new AppError('Erro ao salvar código de verificação', 500, ErrorCode.REDIS_SAVE_ERROR)
        }

        await AuthUserRepository.sendEmailVerificationCode({email: data.email, code: newCode})

        try{
            await redis.set(
                keyCooldown,
                1,
                "EX",
                60
            )
        }catch(error){
            throw new AppError('Erro ao salvar email na fila de cooldown', 500, ErrorCode.REDIS_SAVE_ERROR)
        }

        return {email: data.email}
    }

    static async login(data: AuthDTOs['LoginRequestDTO']): Promise<AuthDTOs['TokensDTO']>{
        const {email, password} = data

        const userCredentials = await userRepository.returnLoginCredentials(email)
        if(!userCredentials) throw new UnauthorizedError('Credenciais inválidas', ErrorCode.INVALID_CREDENTIALS)

        const passwordMatch = await ArgonHash.argonVerify(userCredentials.password, password) 
        if(!passwordMatch) throw new UnauthorizedError('Credenciais inválidas', ErrorCode.INVALID_CREDENTIALS)

        const newHashedPassword = await ArgonHash.argonRehash(password, userCredentials.password)
        if(newHashedPassword) await userRepository.updatePasswordHash(userCredentials.id, newHashedPassword)

        const tokens = await generateTokens(userCredentials.id)
        const {accessToken, refreshToken} = tokens

        if(!accessToken || !refreshToken) throw new AppError('Token inválido', 500, ErrorCode.INTERNAL_SERVER_ERROR)

        return {accessToken, refreshToken}
    }

    static async refreshToken(refreshToken: string): Promise<AuthDTOs['TokensDTO']>{
        try{
            const decodedRefreshToken = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload
            const {jti, sub} = decodedRefreshToken
            const dataTokens = await redis.exists(`refresh-token-${jti}`)
            if(!dataTokens) throw new UnauthorizedError('Refresh token inválido', ErrorCode.INVALID_TOKEN)
            await redis.del(`refresh-token-${jti}`)
            const newTokens = await generateTokens(Number(sub))
            return newTokens
        }catch(error){
            if(error instanceof jwt.TokenExpiredError){
                throw new UnauthorizedError('Refresh token expirado', ErrorCode.TOKEN_EXPIRED)
            }

            if(error instanceof jwt.JsonWebTokenError){
                throw new UnauthorizedError('Refresh token inválido', ErrorCode.INVALID_TOKEN)
            }

            if(error instanceof AppError){
                throw error
            }

            throw new AppError('Erro ao renovar sessão', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }
}