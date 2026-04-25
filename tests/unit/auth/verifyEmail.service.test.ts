import { userRepository } from '@/modules/user/user.repository'
import { ArgonHash } from '@/shared/utils/ArgonHash'
import { verifyKeyExists } from '@/shared/utils/verifyKeyExists' 
import { redis } from '@/lib/redis'
import { AuthUserRepository } from '@/modules/auth/auth.repository'
import { generateCode } from '@/shared/utils/generateCode'
import { AuthUserService } from '@/modules/auth/auth.service'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorCode } from '@/shared/errors/ErrorCodes'

vi.mock('@/modules/user/user.repository')
vi.mock('@/shared/utils/ArgonHash')
vi.mock('@/shared/utils/verifyKeyExists')
vi.mock('@/lib/redis', () => {
    return {
        redis: {
            set: vi.fn()
        }
    }
})
vi.mock('@/modules/auth/auth.repository')
vi.mock('@/shared/utils/generateCode', () => {
    return {
        generateCode: vi.fn()
    }
})

const defaultData = {
    name: 'test',
    email: 'test@gmail.com',
    password: 'test123',
    confirmPassword: 'test123'
}

describe('AuthUserService - verifyEmail', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(userRepository.findByEmail).mockResolvedValue(null)
        vi.mocked(ArgonHash.argonHash).mockResolvedValue('hashed')
        vi.mocked(verifyKeyExists).mockResolvedValue(false)
        vi.mocked(AuthUserRepository.sendEmailVerificationCode).mockResolvedValue()
        vi.mocked(generateCode).mockReturnValue('123456')
        vi.mocked(redis.set).mockResolvedValue('OK')
    })

    it('deveria enviar o código de verificação para o email', async () => {
        const result = await AuthUserService.verifyEmail(defaultData)

        expect(result).toEqual({
            email: defaultData.email,
            name: defaultData.name
        })
    })

    it('deve verificar se o userRepository.findByEmail está sendo chamado com o email de forma correta', async () => {
        await AuthUserService.verifyEmail(defaultData)
        expect(userRepository.findByEmail).toHaveBeenCalledWith(defaultData.email)
    })

    it('deveria hashear a senha e o code antes de salvar no Redis', async () => {
        await AuthUserService.verifyEmail(defaultData)

        expect(ArgonHash.argonHash).toHaveBeenNthCalledWith(1, defaultData.password)
        expect(ArgonHash.argonHash).toHaveBeenNthCalledWith(2, '123456')
        expect(ArgonHash.argonHash).toHaveBeenCalledTimes(2)
    })

    it('deveria verificar se verifyKeyExists está sendo chamado com a key correta', async () => {
        await AuthUserService.verifyEmail(defaultData)

        expect(verifyKeyExists).toHaveBeenCalledWith(`verify-email-cooldown-${defaultData.email}`)
    })

    it('deveria salvar no Redis com a key e o TTL corretos', async () => {
        await AuthUserService.verifyEmail(defaultData)
        expect(redis.set).toHaveBeenNthCalledWith(1,  
            `verify-email-${defaultData.email}`,
            JSON.stringify({
                code: 'hashed',
                name: defaultData.name,
                password: 'hashed'
            }),
            "EX",
            600
        )
        expect(redis.set).toHaveBeenNthCalledWith(2, 
            `verify-email-cooldown-${defaultData.email}`,
            1,
            "EX",
            60
        )
        expect(redis.set).toHaveBeenCalledTimes(2)
    })

    it('deveria chamar sendEmailVerificationCode com email e código corretos', async () => {
        await AuthUserService.verifyEmail(defaultData)
        expect(AuthUserRepository.sendEmailVerificationCode).toHaveBeenCalledWith({email: defaultData.email, code: '123456'})
    })

    describe('erros de negócio', () => {
        it('deveria gerar ConflictError caso o email já esteja cadastrado', async () => {
            vi.mocked(userRepository.findByEmail).mockResolvedValue({id: 1} as any)

            await expect(AuthUserService.verifyEmail(defaultData)).rejects.toMatchObject({
                statusCode: 409,
                code: ErrorCode.USER_ALREADY_EXISTS
            })

            expect(ArgonHash.argonHash).not.toHaveBeenCalled()
            expect(redis.set).not.toHaveBeenCalled()
        })

        it('deveria gerar ConflictError caso o cooldown do email ainda estiver ativo', async () => {
            vi.mocked(verifyKeyExists).mockResolvedValue(true)

            await expect(AuthUserService.verifyEmail(defaultData)).rejects.toMatchObject({
                statusCode: 409,
                code: ErrorCode.LIMIT_ATTEMPTS
            })
            expect(redis.set).not.toHaveBeenCalled()
        })
    })
    
    describe('erros de infraestrutura', () => {
        it('deveria lançar AppError se o primeiro redis.set (code) falhar', async () => {
            vi.mocked(redis.set).mockRejectedValueOnce(new Error('Redis down'))

            await expect(AuthUserService.verifyEmail(defaultData)).rejects.toMatchObject({
                statusCode: 500,
                code: ErrorCode.REDIS_SAVE_ERROR
            })

            expect(redis.set).toHaveBeenCalledTimes(1)
            expect(AuthUserRepository.sendEmailVerificationCode).not.toHaveBeenCalled()
        })

        it('deveria lançar AppError se o segundo redis.set (email cooldown) falhar', async () => {
            vi.mocked(redis.set).mockRejectedValueOnce(new Error('Redis down'))

            await expect(AuthUserService.verifyEmail(defaultData)).rejects.toMatchObject({
                statusCode: 500,
                code: ErrorCode.REDIS_SAVE_ERROR
            })
        })
    })
})