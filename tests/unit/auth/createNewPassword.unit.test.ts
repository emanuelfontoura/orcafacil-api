import { describe, it, vi, expect, beforeEach } from 'vitest'
import { redis } from '@/lib/redis'
import { ArgonHash } from '@/shared/utils/ArgonHash'
import { UserRepository } from '@/modules/user/user.repository'
import { AuthUserService } from '@/modules/auth/auth.service'
import { AppError } from '@/shared/errors/AppError'
import { ErrorCode } from '@/shared/errors/ErrorCodes'

vi.mock('@/lib/redis', () => {
    return{
        redis: {
            get: vi.fn()
        }
    }
})
vi.mock('@/shared/utils/ArgonHash')
vi.mock('@/modules/user/user.repository')

describe('Unit test - AuthUserService - createNewPassword', () => {
    const body = {
        tokenUUID: '987fcdeb-51a2-43d7-9012-3456789abcde',
        newPassword: '12345678'
    }

    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(redis.get).mockResolvedValue(JSON.stringify({id: 'user-id', code: '123456', authorized: true, attempts: 1}))
        vi.mocked(ArgonHash.argonHash).mockResolvedValue('hashed-new-password')
        vi.mocked(UserRepository.updatePasswordHash).mockResolvedValue()
    })

    it('deveria criar uma nova senha com sucesso', async () => {
        await expect(AuthUserService.createNewPassword(body)).resolves.toBeUndefined()
        expect(redis.get).toHaveBeenCalledWith(`recovery-password-${body.tokenUUID}`)
        expect(ArgonHash.argonHash).toHaveBeenCalledWith(body.newPassword)
        expect(UserRepository.updatePasswordHash).toHaveBeenCalledWith('user-id', 'hashed-new-password')
    })

    it('deveria gerar um AppError se o redis causar erro ao dar o get na key', async () => {
        vi.mocked(redis.get).mockRejectedValue(new AppError('Erro ao obter dados da recuperação de senha', 500, ErrorCode.REDIS_GET_ERROR))

        await expect(AuthUserService.createNewPassword(body)).rejects.toMatchObject({
            code: ErrorCode.REDIS_GET_ERROR
        })
    })

    it('deveria gerar um UnauthorizedError ao receber um tokenUUID inválido/não encontrar a key no redis', async () => {
        vi.mocked(redis.get).mockResolvedValue(null)

        await expect(AuthUserService.createNewPassword(body)).rejects.toMatchObject({
            code: ErrorCode.INVALID_TOKEN
        })
    })

    it('deveria gerar um UnauthorizedError caso o authorized seja false', async () => {
        vi.mocked(redis.get).mockResolvedValue(JSON.stringify({id: 'user-id', code: '123456', authorized: false, attempts: 1}))

        await expect(AuthUserService.createNewPassword(body)).rejects.toMatchObject({
            code: ErrorCode.UNAUTHORIZED_USER
        })
        expect(ArgonHash.argonHash).not.toHaveBeenCalled()
        expect(UserRepository.updatePasswordHash).not.toHaveBeenCalled()
    })

    it('deveria retornar um Erro caso o Argon dê erro ao hashear a nova senha', async () => {
        vi.mocked(ArgonHash.argonHash).mockRejectedValue(new Error('Erro'))

        await expect(AuthUserService.createNewPassword(body)).rejects.toThrow('Erro')
    })

    it('deveria retornar um AppErro caso o updatePasswordHash dê erro', async () => {
        vi.mocked(UserRepository.updatePasswordHash).mockRejectedValue(new AppError('Erro', 500, ErrorCode.UPDATE_DATABASE_ERROR))

        await expect(AuthUserService.createNewPassword(body)).rejects.toMatchObject({
            code: ErrorCode.UPDATE_DATABASE_ERROR
        })
    })
})