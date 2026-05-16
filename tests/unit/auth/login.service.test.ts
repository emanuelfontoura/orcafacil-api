import { describe, it, expect, vi, beforeEach } from "vitest"
import { userRepository } from "@/modules/user/user.repository"
import { ArgonHash } from "@/shared/utils/ArgonHash"
import { randomUUID } from "crypto"
import { generateTokens } from "@/shared/utils/generateTokens"
import { redis } from "@/lib/redis"

vi.mock('@/modules/user/user.repository')
vi.mock('@/shared/utils/ArgonHash')
vi.mock('crypto')
vi.mock('@/shared/utils/generateTokens')
vi.mock('@/lib/redis')

describe('Unit test - AuthUserService - login', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(userRepository.returnLoginCredentials).mockResolvedValue({id: 1, email: 'teste@gmail.com', password: '12345678'})
        vi.mocked(userRepository.updatePasswordHash).mockResolvedValue()
        vi.mocked(ArgonHash.argonVerify).mockResolvedValue(true)
        vi.mocked(ArgonHash.argonRehash).mockResolvedValue('12345678')
        vi.mocked(randomUUID).mockResolvedValue('3181d0e7-b884-4f0f-b233-324e9ae9e180')
        vi.mocked(generateTokens).mockResolvedValue({accessToken: '123', refreshToken: '123'})
        vi.mocked(redis.set).mockResolvedValue('OK')
    })

    it('deveria logar, retornar o acessToken e o refreshToken no cookies e retornar status 200', async () => {
        
    })
})