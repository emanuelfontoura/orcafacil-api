import { AuthUserService } from "@/modules/auth/auth.service";
import { redis } from "@/lib/redis";
import { AuthUserRepository } from "@/modules/auth/auth.repository";
import { userRepository } from "@/modules/user/user.repository";
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/redis', () => {
    return {
        redis: {
            set: vi.fn()
        }
    }
})
vi.mock('@/modules/auth/auth.repository')
vi.mock('@/modules/user/user.repository')

const defaultBody = {
    email: 'teste@gmail.com',
    name: 'Teste',
    password: '12345678',
    confirmPassword: '12345678'
}

describe('Integration test - AuthUserService - verifyEmail', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(redis.set).mockResolvedValue('OK')
        vi.mocked(AuthUserRepository.sendEmailVerificationCode).mockResolvedValue()
        vi.mocked(userRepository.findByEmail).mockResolvedValue(null)
    })   

    it('deveria retornar sucesso com statusCode 200', async () => {
        const result = await AuthUserService.verifyEmail(defaultBody)

        expect(result).toEqual({
            email: defaultBody.email,
            name: defaultBody.name
        })
    })
})