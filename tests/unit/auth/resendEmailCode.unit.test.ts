import { ArgonHash } from '@/shared/utils/ArgonHash'
import { verifyKeyExists } from '@/shared/utils/verifyKeyExists'
import { redis } from '@/lib/redis'
import { AuthUserRepository } from '@/modules/auth/auth.repository'
import { generateCode } from '@/shared/utils/generateCode'
import { AuthUserService } from '@/modules/auth/auth.service'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorCode } from '@/shared/errors/ErrorCodes'

vi.mock('@/shared/utils/ArgonHash')
vi.mock('@/shared/utils/verifyKeyExists')
vi.mock('@/lib/redis', () => {
    return {
        redis: {
            get: vi.fn(),
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

describe('Unit test - AuthUserService - resendEmailCode', () => {
    const defaultData = {
        email: 'test@gmail.com'
    }

    const storedData = {
        code: 'old-hashed-code',
        name: 'test',
        cnpjCpf: '12345678909',
        password: 'hashed-password'
    }

    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(verifyKeyExists).mockResolvedValue(false)
        vi.mocked(redis.get).mockResolvedValue(JSON.stringify(storedData))
        vi.mocked(redis.set).mockResolvedValue('OK')
        vi.mocked(generateCode).mockReturnValue('654321')
        vi.mocked(ArgonHash.argonHash).mockResolvedValue('new-hashed-code')
        vi.mocked(AuthUserRepository.sendEmailVerificationCode).mockResolvedValue()
    })

    it('deveria reenviar o código e retornar o email', async () => {
        const result = await AuthUserService.resendEmailCode(defaultData)

        expect(result).toEqual({ email: defaultData.email })
    })

    it('deveria verificar o cooldown e buscar o cadastro pendente com as keys corretas', async () => {
        await AuthUserService.resendEmailCode(defaultData)

        expect(verifyKeyExists).toHaveBeenCalledWith(`verify-email-cooldown-${defaultData.email}`)
        expect(redis.get).toHaveBeenCalledWith(`verify-email-${defaultData.email}`)
    })

    it('deveria hashear o novo código antes de salvar no Redis', async () => {
        await AuthUserService.resendEmailCode(defaultData)

        expect(ArgonHash.argonHash).toHaveBeenCalledWith('654321')
        expect(ArgonHash.argonHash).toHaveBeenCalledTimes(1)
    })

    it('deveria regravar o cadastro com o hash do novo código e o cooldown com os TTLs corretos', async () => {
        await AuthUserService.resendEmailCode(defaultData)

        expect(redis.set).toHaveBeenNthCalledWith(1,
            `verify-email-${defaultData.email}`,
            JSON.stringify({
                ...storedData,
                code: 'new-hashed-code'
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

    it('não deveria salvar o código em texto puro no Redis', async () => {
        await AuthUserService.resendEmailCode(defaultData)

        const savedData = JSON.parse(vi.mocked(redis.set).mock.calls[0][1] as string)
        expect(savedData.code).not.toBe('654321')
    })

    it('deveria enviar o código em texto puro por email', async () => {
        await AuthUserService.resendEmailCode(defaultData)

        expect(AuthUserRepository.sendEmailVerificationCode).toHaveBeenCalledWith({email: defaultData.email, code: '654321'})
    })

    describe('erros de negócio', () => {
        it('deveria gerar ConflictError caso o cooldown do email ainda estiver ativo', async () => {
            vi.mocked(verifyKeyExists).mockResolvedValue(true)

            await expect(AuthUserService.resendEmailCode(defaultData)).rejects.toMatchObject({
                statusCode: 409,
                code: ErrorCode.LIMIT_ATTEMPTS
            })

            expect(redis.get).not.toHaveBeenCalled()
            expect(redis.set).not.toHaveBeenCalled()
            expect(AuthUserRepository.sendEmailVerificationCode).not.toHaveBeenCalled()
        })

        it('deveria gerar ConflictError caso o cadastro pendente tenha expirado', async () => {
            vi.mocked(redis.get).mockResolvedValue(null)

            await expect(AuthUserService.resendEmailCode(defaultData)).rejects.toMatchObject({
                statusCode: 409,
                code: ErrorCode.TIME_OUT_REGISTER
            })

            expect(redis.set).not.toHaveBeenCalled()
            expect(AuthUserRepository.sendEmailVerificationCode).not.toHaveBeenCalled()
        })
    })

    describe('erros de infraestrutura', () => {
        it('deveria lançar AppError se o redis.get falhar', async () => {
            vi.mocked(redis.get).mockRejectedValueOnce(new Error('Redis down'))

            await expect(AuthUserService.resendEmailCode(defaultData)).rejects.toMatchObject({
                statusCode: 500,
                code: ErrorCode.REDIS_GET_ERROR
            })

            expect(redis.set).not.toHaveBeenCalled()
        })

        it('deveria lançar AppError se o primeiro redis.set (code) falhar', async () => {
            vi.mocked(redis.set).mockRejectedValueOnce(new Error('Redis down'))

            await expect(AuthUserService.resendEmailCode(defaultData)).rejects.toMatchObject({
                statusCode: 500,
                code: ErrorCode.REDIS_SAVE_ERROR
            })

            expect(redis.set).toHaveBeenCalledTimes(1)
            expect(AuthUserRepository.sendEmailVerificationCode).not.toHaveBeenCalled()
        })

        it('deveria lançar AppError se o segundo redis.set (email cooldown) falhar', async () => {
            vi.mocked(redis.set).mockResolvedValueOnce('OK').mockRejectedValueOnce(new Error('Redis down'))

            await expect(AuthUserService.resendEmailCode(defaultData)).rejects.toMatchObject({
                statusCode: 500,
                code: ErrorCode.REDIS_SAVE_ERROR
            })

            expect(AuthUserRepository.sendEmailVerificationCode).toHaveBeenCalledTimes(1)
        })
    })
})
