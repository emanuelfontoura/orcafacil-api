import { AuthDTOs } from '@/modules/auth/auth.dtos'
import { AuthUserRepository } from '@/modules/auth/auth.repository'
import { userRepository } from '@/modules/user/user.repository'
import { redis } from '@/lib/redis'
import argon2 from "argon2"
import 'dotenv/config'
import { ConflictError } from '@/shared/errors/ConflictError'
import { ErrorCode } from '@/shared/errors/ErrorCodes'
import { AppError } from '@/shared/errors/AppError'
import { NotFoundError } from '@/shared/errors/NotFoundError'
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError'
import { verifyKeyExists } from '@/shared/utils/verifyKeyExists'
import { generateCode } from '@/shared/utils/generateCode'

export class AuthUserService{

    static async verifyEmail(data: AuthDTOs['VerifyEmailRequestDTO']):Promise<AuthDTOs['VerifyEmailResponseDTO']>{
        // Email exists
        const user = await userRepository.findByEmail(data.email)
        if(user) throw new ConflictError('Esse email já está cadastrado.', ErrorCode.USER_ALREADY_EXISTS)

        // Password hash with Argon2
        let hashedPassword: string
        try{
            hashedPassword = await argon2.hash(data.password + process.env.PEPPER, {
                type: argon2.argon2id,
                memoryCost: 65536,
                timeCost: 3,
                parallelism: 1
            }) 
        }catch(error){
            throw new AppError('Ocorreu um erro ao realizar a criptografia da senha', 500, ErrorCode.INTERNAL_HASH_ERROR)
        }
        
        const keyExists = await verifyKeyExists(`verify-email-cooldown-${data.email}`)
        if(keyExists) throw new ConflictError('Aguarde para realizar esta ação novamente', ErrorCode.SENDING_EMAIL_LIMIT)

        // Save on Redis
        const code = generateCode()

        try{
            await redis.set(
                `verify-email-${data.email}`,
                JSON.stringify({
                    code,
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
        const dataUser = await redis.get(`verify-email-${data.email}`) 
        if(!dataUser){
            throw new NotFoundError('Código expirado ou não encontrado.', ErrorCode.INVALID_OR_EXPIRED_CODE)
        }
        const dataParsed = JSON.parse(dataUser)

        if(dataParsed.code !==  data.code){
            throw new UnauthorizedError('Código inválido.', ErrorCode.INVALID_CODE)
        }

        const user = await userRepository.createUser({
            email: data.email,
            name: dataParsed.name,
            password: dataParsed.password 
        })
        if(!user) throw new AppError('Houve um erro ao criar o usuário.', 400, ErrorCode.USER_CREATION_FAILED)
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
        }
    }

    static async resendEmailCode(data: AuthDTOs['ResendEmailCodeDTO']): Promise<AuthDTOs['ResendEmailCodeDTO']>{
        const keyCooldown = `verify-email-cooldown-${data.email}`
        const keyNewCode = `verify-email-${data.email}`

        const keyExists = await verifyKeyExists(keyCooldown)
        if(keyExists) throw new ConflictError('Aguarde para realizar esta ação novamente', ErrorCode.SENDING_EMAIL_LIMIT)

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
        }catch(error){
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

}