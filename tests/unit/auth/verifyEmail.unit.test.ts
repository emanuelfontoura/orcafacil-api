import { describe, expect, vi, it } from 'vitest'
import { AuthUserService } from '@/modules/auth/auth.service'
import { ErrorCode } from '@/shared/errors/ErrorCodes'
import { AppError } from '@/shared/errors/AppError'

const verifyEmailInput = {name: 'Teste', cnpjCpf: '00000000000', email: 'teste@gmail.com', password: '12345678', confirmPassword: '12345678'}
const existingUser = {id: 1, cnpjCpf: '00000000000', email: 'teste@gmail.com', name: 'Teste', createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z')}

function makeSut(){
    const UserRepository = {
        findByEmail: vi.fn().mockResolvedValue(null)
    }
    const ArgonHash = {
        hash: vi.fn()
                .mockResolvedValueOnce('hashed-password')
                .mockResolvedValueOnce('hashed-code')
    }
    const Redis = {
        set: vi.fn().mockResolvedValue('OK'),
        exists: vi.fn().mockResolvedValue(0),
    }
    const AuthUserRepository = {
        sendEmailVerificationCode: vi.fn().mockResolvedValue(undefined)
    }

    const sut = new AuthUserService(
        AuthUserRepository as any,
        UserRepository as any,
        ArgonHash as any,
        Redis as any,
        {} as any
    )

    return {sut, UserRepository, ArgonHash, Redis, AuthUserRepository}
}

describe('AuthUserService.verifyEmail', () => {

    // Happy path
    it('deve retornar os dados de cadastro do usuário', async () => {
        // Arrange
        const {sut, UserRepository, ArgonHash, Redis, AuthUserRepository} = makeSut()

        // Act
        const result = await sut.verifyEmail(verifyEmailInput)

        // Assert
        expect(result).toEqual({
            email: 'teste@gmail.com',
            name: 'Teste',
            cnpjCpf: '00000000000' 
        })

        // Espião
        expect(UserRepository.findByEmail).toHaveBeenCalledWith('teste@gmail.com')
        expect(ArgonHash.hash).toHaveBeenCalledTimes(2)
        expect(ArgonHash.hash).toHaveBeenNthCalledWith(1, '12345678')
        expect(ArgonHash.hash).toHaveBeenNthCalledWith(2, expect.stringMatching(/^\d{6}$/))
        expect(Redis.exists).toHaveBeenCalledWith('verify-email-cooldown-teste@gmail.com')
        expect(Redis.set).toHaveBeenCalledTimes(2)
        expect(Redis.set).toHaveBeenNthCalledWith(
            1,
            'verify-email-teste@gmail.com',
            expect.any(String),
            'EX',
            600
        )
        expect(Redis.set).toHaveBeenNthCalledWith(
            2,
            'verify-email-cooldown-teste@gmail.com',
            1,
            'EX',
            60
        )
        const payload = JSON.parse(Redis.set.mock.calls[0][1])
        expect(payload).toEqual({
            code: 'hashed-code',      
            name: 'Teste',
            cnpjCpf: '00000000000',
            password: 'hashed-password'
        })
        expect(AuthUserRepository.sendEmailVerificationCode).toHaveBeenCalledWith({
            email: 'teste@gmail.com',
            code: expect.stringMatching(/^\d{6}$/)
        })
    })

    // Email já utilizado
    it('deve retornar 409 ConflictError caso o email já tenha usuário vinculado', async () => {
        // Arrange
        const {sut, UserRepository, ArgonHash, Redis, AuthUserRepository} = makeSut()
        UserRepository.findByEmail.mockResolvedValue(existingUser)

        // Act
        const result = sut.verifyEmail(verifyEmailInput)

        // Assert
        await expect(result).rejects.toMatchObject({statusCode: 409, message: 'Esse email já está cadastrado.', code: ErrorCode.USER_ALREADY_EXISTS})

        // Espião
        expect(UserRepository.findByEmail).toHaveBeenCalledWith('teste@gmail.com')
        expect(ArgonHash.hash).not.toHaveBeenCalled()
        expect(Redis.exists).not.toHaveBeenCalled()
        expect(Redis.set).not.toHaveBeenCalled()
        expect(AuthUserRepository.sendEmailVerificationCode).not.toHaveBeenCalled()
    })

    // Email em cooldown
    it('deve retornar 409 ConflictError caso o email esteja em cooldown no redis', async () => {
        // Arrange
        const {sut, Redis, UserRepository, ArgonHash, AuthUserRepository} = makeSut()
        Redis.exists.mockResolvedValue(1)

        // Act
        const result = sut.verifyEmail(verifyEmailInput)

        // Assert
        await expect(result).rejects.toMatchObject({statusCode: 409, message: 'Aguarde para realizar esta ação novamente.', code: ErrorCode.LIMIT_ATTEMPTS})

        // Espião
        expect(UserRepository.findByEmail).toHaveBeenCalledWith('teste@gmail.com')
        expect(ArgonHash.hash).toHaveBeenCalledTimes(1)
        expect(ArgonHash.hash).toHaveBeenCalledWith('12345678')
        expect(Redis.exists).toHaveBeenCalledWith('verify-email-cooldown-teste@gmail.com')
        expect(Redis.set).not.toHaveBeenCalled()
        expect(AuthUserRepository.sendEmailVerificationCode).not.toHaveBeenCalled()
    })

    // Erro no primeiro Redis.set
    it('deve retornar 500 AppError ao dar erro no primeiro Redis.set', async () => {
        // Arrange
        const {sut, Redis, ArgonHash, AuthUserRepository, UserRepository} = makeSut()
        Redis.set.mockRejectedValueOnce(new Error('redis'))

        // Act
        const result = sut.verifyEmail(verifyEmailInput)

        // Assert
        await expect(result).rejects.toMatchObject({statusCode: 500, message: 'Erro ao salvar código de verificação.', code: ErrorCode.REDIS_SAVE_ERROR})

        // Espião
        expect(UserRepository.findByEmail).toHaveBeenCalledWith('teste@gmail.com')
        expect(ArgonHash.hash).toHaveBeenCalledTimes(2)
        expect(Redis.exists).toHaveBeenCalledWith('verify-email-cooldown-teste@gmail.com')
        expect(Redis.set).toHaveBeenCalledTimes(1)
        expect(Redis.set).toHaveBeenNthCalledWith(
            1,
            'verify-email-teste@gmail.com',
            expect.any(String),
            'EX',
            600
        )
        expect(AuthUserRepository.sendEmailVerificationCode).not.toHaveBeenCalled()
    })

    it('deve retornar 500 AppError ao dar erro no segundo Redis.set', async () => {
        // Arrange
        const {sut, Redis, ArgonHash, UserRepository, AuthUserRepository} = makeSut() 
        Redis.set
                .mockResolvedValueOnce('OK')
                .mockRejectedValueOnce(new Error('redis'))

        // Act
        const result = sut.verifyEmail(verifyEmailInput)

        // Assert
        await expect(result).rejects.toMatchObject({statusCode: 500, message: 'Erro ao salvar email na fila de cooldown.', code: ErrorCode.REDIS_SAVE_ERROR})

        // Espião
        expect(UserRepository.findByEmail).toHaveBeenCalledWith('teste@gmail.com')
        expect(ArgonHash.hash).toHaveBeenCalledTimes(2)
        expect(Redis.exists).toHaveBeenCalledWith('verify-email-cooldown-teste@gmail.com')
        expect(Redis.set).toHaveBeenCalledTimes(2)
        expect(Redis.set).toHaveBeenNthCalledWith(
            1,
            'verify-email-teste@gmail.com',
            expect.any(String),
            'EX',
            600
        )
        expect(Redis.set).toHaveBeenNthCalledWith(
            2,
            'verify-email-cooldown-teste@gmail.com',
            1,
            'EX',
            60
        )
        expect(AuthUserRepository.sendEmailVerificationCode).toHaveBeenCalledTimes(1)
    })

    it('deve retornar 500 AppError caso o envio do email falhe', async () => {
        // Arrange
        const {sut, AuthUserRepository, UserRepository, ArgonHash, Redis} = makeSut()
        const sendError = new AppError('Erro ao enviar email de verificação.', 500, ErrorCode.SEND_EMAIL_CODE_ERROR)
        AuthUserRepository.sendEmailVerificationCode.mockRejectedValueOnce(sendError)

        // Act
        const result = sut.verifyEmail(verifyEmailInput)

        // Assert
        await expect(result).rejects.toBe(sendError)

        // Espião
        expect(UserRepository.findByEmail).toHaveBeenCalledWith('teste@gmail.com')
        expect(ArgonHash.hash).toHaveBeenCalledTimes(2)
        expect(Redis.exists).toHaveBeenCalledWith('verify-email-cooldown-teste@gmail.com')
        expect(Redis.set).toHaveBeenCalledTimes(1)
        expect(Redis.set).toHaveBeenCalledWith('verify-email-teste@gmail.com', expect.any(String), 'EX', 600)
        expect(AuthUserRepository.sendEmailVerificationCode).toHaveBeenCalledTimes(1)
    })
})