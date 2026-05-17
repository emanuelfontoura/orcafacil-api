import { describe, it, expect, vi, beforeEach } from "vitest"
import { userRepository } from "@/modules/user/user.repository"
import { ArgonHash } from "@/shared/utils/ArgonHash"
import { randomUUID } from "crypto"
import { generateTokens } from "@/shared/utils/generateTokens"
import { redis } from "@/lib/redis"
import { AuthUserService } from "@/modules/auth/auth.service"
import { ErrorCode } from "@/shared/errors/ErrorCodes"
import { AppError } from "@/shared/errors/AppError"

vi.mock('@/modules/user/user.repository')
vi.mock('@/shared/utils/ArgonHash')
vi.mock('crypto')
vi.mock('@/shared/utils/generateTokens')
vi.mock('@/lib/redis')

describe('Unit test - AuthUserService - login', () => {
    const body = {
        email: 'teste@gmail.com',
        password: '12345678'
    }
    const tokens = {
        accessToken: '123',
        refreshToken: '123'
    }
    const id = 1
    const jti = '3181d0e7-b884-4f0f-b233-324e9ae9e180'

    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(userRepository.returnLoginCredentials).mockResolvedValue({id, email: body.email, password: body.password})
        vi.mocked(userRepository.updatePasswordHash).mockResolvedValue()
        vi.mocked(ArgonHash.argonVerify).mockResolvedValue(true)
        vi.mocked(ArgonHash.argonRehash).mockResolvedValue(body.password)
        vi.mocked(randomUUID).mockReturnValue(jti)
        vi.mocked(generateTokens).mockResolvedValue(tokens)
        vi.mocked(redis.set).mockResolvedValue('OK')
    })

    it('deveria retornar um objeto com o acessToken e o refreshToken', async () => {
        const data = await AuthUserService.login(body)

        expect(userRepository.returnLoginCredentials).toHaveBeenCalledWith(body.email)
        expect(userRepository.updatePasswordHash).toHaveBeenCalledWith(1, body.password)

        expect(ArgonHash.argonVerify).toHaveBeenCalledWith(body.password, body.password)
        expect(ArgonHash.argonRehash).toHaveBeenCalledWith(body.password, body.password)

        expect(randomUUID).toHaveBeenCalled()

        expect(generateTokens).toHaveBeenCalledWith(id, jti)

        expect(redis.set).toHaveBeenCalledWith(`refresh-token-${jti}`, id, 'EX', 604800)

        expect(data).toEqual(tokens)
    })

    it('deveria retornar UnauthorizedError caso não encontre as credenciais', async () => {
        vi.mocked(userRepository.returnLoginCredentials).mockResolvedValue(null)

        await expect(AuthUserService.login(body)).rejects.toMatchObject({
            statusCode: 401,
            code: ErrorCode.INVALID_CREDENTIALS
        })
    })

    it('deveria retornar UnauthorizedError caso a verificação da senha dê credenciais incorretas', async () => {
        vi.mocked(ArgonHash.argonVerify).mockResolvedValue(false)

        await expect(AuthUserService.login(body)).rejects.toMatchObject({
            statusCode: 401,
            code: ErrorCode.INVALID_CREDENTIALS
        })
    })

    it('deveria NÃO atualizar o hash caso não precise de rehash', async () => {
        vi.mocked(ArgonHash.argonRehash).mockResolvedValue(null)

        await AuthUserService.login(body)
        
        expect(ArgonHash.argonRehash).toHaveBeenCalledWith(body.password, body.password)

        expect(userRepository.updatePasswordHash).not.toHaveBeenCalled()
    })

    it('deveria falhar caso o returnLoginCredentials falhe', async () => {
        vi.mocked(userRepository.returnLoginCredentials).mockRejectedValue(new AppError('Erro', 500, ErrorCode.INTERNAL_SERVER_ERROR))

        await expect(AuthUserService.login(body)).rejects.toMatchObject({
            statusCode: 500,
            code: ErrorCode.INTERNAL_SERVER_ERROR
        })
    })

    it('deveria falhar caso o argonVerify falhe', async () => {
        vi.mocked(ArgonHash.argonVerify).mockRejectedValue(new AppError('Erro', 500, ErrorCode.INTERNAL_SERVER_ERROR))

        await expect(AuthUserService.login(body)).rejects.toMatchObject({
            statusCode: 500,
            code: ErrorCode.INTERNAL_SERVER_ERROR
        })
    })

    it('deveria falhar caso o argonRehash falhe', async () => {
        vi.mocked(ArgonHash.argonRehash).mockRejectedValue(new AppError('Erro', 500, ErrorCode.INTERNAL_SERVER_ERROR))

        await expect(AuthUserService.login(body)).rejects.toMatchObject({
            statusCode: 500,
            code: ErrorCode.INTERNAL_SERVER_ERROR
        })
    })

    it('deveria falhar caso o updatePasswordHash falhe', async () => {
        vi.mocked(userRepository.updatePasswordHash).mockRejectedValue(new AppError('Erro', 500, ErrorCode.UPDATE_DATABASE_ERROR))

        await expect(AuthUserService.login(body)).rejects.toMatchObject({
            statusCode: 500,
            code: ErrorCode.UPDATE_DATABASE_ERROR
        })
    })

    it('deveria falhar caso o generateTokens falhe', async () => {
        vi.mocked(generateTokens).mockRejectedValue(new AppError('Erro', 500, ErrorCode.INTERNAL_SERVER_ERROR))

        await expect(AuthUserService.login(body)).rejects.toMatchObject({
            statusCode: 500,
            code: ErrorCode.INTERNAL_SERVER_ERROR
        })
    })

    it('deveria falhar caso o redis.set falhe', async () => {
        vi.mocked(redis.set).mockRejectedValue(new AppError('Erro', 500, ErrorCode.INTERNAL_SERVER_ERROR))

        await expect(AuthUserService.login(body)).rejects.toMatchObject(
            {
                statusCode: 500,
                code: ErrorCode.REDIS_SAVE_ERROR
            }
        )
    })
})