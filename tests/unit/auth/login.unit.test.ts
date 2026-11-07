// module: auth
// route: login

import { describe, it, expect, vi } from 'vitest'
import { AuthUserService } from '@/modules/auth/auth.service'
import { ErrorCode } from '@/shared/errors/ErrorCodes'

function makeSut(){
    const UserRepository = {
        returnLoginCredentials: vi.fn().mockResolvedValue({id: 1, cnpjCpf: '00000000000', email: 'teste@gmail.com', password: 'hash-salvo'}),
        updatePasswordHash: vi.fn().mockResolvedValue(undefined)
    }
    const ArgonHash = {
        verify: vi.fn().mockResolvedValue(true),
        rehash: vi.fn().mockResolvedValue(null)
    }
    const Redis = {
        set: vi.fn().mockResolvedValue('OK')
    }
    const TokenService = {
        generateAccessToken: vi.fn().mockReturnValue('access'),
        generateRefreshToken: vi.fn().mockReturnValue('refresh')
    }

    const sut = new AuthUserService(
        {} as any,
        UserRepository as any,
        ArgonHash as any,
        Redis as any,
        TokenService as any
    )

    return {sut, UserRepository, ArgonHash, Redis, TokenService}
}

describe('AuthUserService.login', () => {
    // Error cases
    it('recusa com 401 quando email não existe', async () => {
        // Arrange
        const {sut, UserRepository} = makeSut()
        UserRepository.returnLoginCredentials.mockResolvedValue(null)

        // Act
        const result = sut.login({email: 'teste@gmail.com', password: '123'})

        // Assert
        await expect(result).rejects.toMatchObject({statusCode: 401, code: ErrorCode.INVALID_CREDENTIALS})

        // Espião
        expect(UserRepository.returnLoginCredentials).toHaveBeenCalledWith('teste@gmail.com')
    })

    it('recusa com 401 quando a senha está incorreta', async () => {
        // Arrange
        const {sut, UserRepository, ArgonHash, TokenService} = makeSut()
        ArgonHash.verify.mockResolvedValue(false)

        // Act
        const result = sut.login({email: 'teste@gmail.com', password: 'senha-errada'})

        // Assert
        await expect(result).rejects.toMatchObject({statusCode: 401, code: ErrorCode.INVALID_CREDENTIALS})

        // Espião
        expect(UserRepository.returnLoginCredentials).toHaveBeenCalledWith('teste@gmail.com')
        expect(ArgonHash.verify).toHaveBeenCalledWith('hash-salvo', 'senha-errada')
        expect(TokenService.generateAccessToken).not.toHaveBeenCalled()
        expect(TokenService.generateRefreshToken).not.toHaveBeenCalled()
    })

    it('rehash necessário', async () => {
        // Arrange
        const {sut, UserRepository, ArgonHash} = makeSut()
        ArgonHash.rehash.mockResolvedValue('hash-novo')

        // Act
        const result = await sut.login({email: 'teste@gmail.com', password: '123'})

        // Assert
        expect(result).toEqual({accessToken: 'access', refreshToken: 'refresh'})

        // Espião
        expect(ArgonHash.rehash).toHaveBeenCalledWith('123', 'hash-salvo')
        expect(UserRepository.updatePasswordHash).toHaveBeenCalledWith(1, 'hash-novo')
    })

    it('deve retornar REDIS_SAVE_ERROR caso redis falhe ao salvar refresh token', async () => {
        // Arrange
        const {sut, Redis} = makeSut()
        Redis.set.mockRejectedValue(new Error('down'))

        // Act
        const result = sut.login({email: 'teste@gmail.com', password: '123'})

        // Assert
        await expect(result).rejects.toMatchObject({statusCode: 500, code: ErrorCode.REDIS_SAVE_ERROR})

        // Espião
        expect(Redis.set).toHaveBeenCalledTimes(1)
    })

    // Happy path
    it('deve retornar os tokens e salvar o refresh token no Redis', async () => {
        // Arrange
        const {sut, UserRepository, ArgonHash, Redis, TokenService} = makeSut()

        // Act
        const result = await sut.login({email: 'teste@gmail.com', password: '123'})

        // Assert
        expect(result).toEqual({
            accessToken: 'access',
            refreshToken: 'refresh'
        })

        // Espião
        expect(UserRepository.returnLoginCredentials).toHaveBeenCalledWith('teste@gmail.com')
        expect(ArgonHash.verify).toHaveBeenCalledWith('hash-salvo', '123')
        expect(ArgonHash.rehash).toHaveBeenCalledWith('123', 'hash-salvo')
        expect(UserRepository.updatePasswordHash).not.toHaveBeenCalled()
        expect(TokenService.generateRefreshToken).toHaveBeenCalledWith({userId: '1', jti: expect.any(String)})
        expect(Redis.set).toHaveBeenCalledWith(expect.stringContaining('refresh-token'), 1, 'EX', 604800)
    })
})