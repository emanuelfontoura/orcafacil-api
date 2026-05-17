import { AuthUserRepository } from "@/modules/auth/auth.repository";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { ErrorCode } from "@/shared/errors/ErrorCodes";
import request from "supertest";
import express from "express"
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { authUserRoutes } from "@/modules/auth/auth.route";
import { handleError } from "@/middlewares/handleError";

vi.mock('@/modules/auth/auth.repository', () => {
    return {
        AuthUserRepository: {
            sendEmailVerificationCode: vi.fn()
        }
    }
})

describe('Integration test - AuthUserService - verifyEmail', () => {
    const defaultBody = {
        email: 'teste@gmail.com',
        name: 'Teste',
        password: '12345678',
        confirmPassword: '12345678'
    }
    const route = '/user/auth/email/verify'
    let app: any

    beforeEach(async () => {
        vi.clearAllMocks()

        app = express()
        app.use(express.json())
        app.use('/user/auth', authUserRoutes)
        app.use(handleError)

        await prisma.user.deleteMany()

        const keys = await redis.keys('verify-email*')
        if(keys.length > 0) await redis.del(...keys)

        vi.mocked(AuthUserRepository.sendEmailVerificationCode).mockResolvedValue()
    })   

    afterAll(async () => {
        await prisma.$disconnect()
        await redis.quit()
    })

    it('deveria retornar sucesso com statusCode 200', async () => {
        const response = await request(app).post(route).send(defaultBody)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({
            success: true,
            data: {
                email: defaultBody.email,
                name: defaultBody.name
            }
        })
        expect(AuthUserRepository.sendEmailVerificationCode).toHaveBeenCalledOnce()
        const verifyEmailData =  await redis.get(`verify-email-${defaultBody.email}`)
        expect(verifyEmailData).not.toBeNull()
        
        const parsedEmailData = JSON.parse(verifyEmailData!)
        expect(parsedEmailData).toHaveProperty('code')
        expect(parsedEmailData).toHaveProperty('name')
        expect(parsedEmailData).toHaveProperty('password')

        expect(parsedEmailData.name).toBe(defaultBody.name)

        const keyCooldown = await redis.get(`verify-email-cooldown-${defaultBody.email}`)
        expect(keyCooldown).toBe('1')
    })

    
    it('deveria bloquear caso algum cooldown esteja ativo', async() => {
        await redis.set(
            `verify-email-cooldown-${defaultBody.email}`,
            1,
            'EX',
            60
        )

        const response = await request(app).post(route).send(defaultBody)
        expect(response.status).toBe(409)
        expect(response.body).toMatchObject({
            success: false,
            code: ErrorCode.LIMIT_ATTEMPTS
        })
    })

    it('deveria retornar erro caso falhe envio do email', async() => {
        vi.mocked(AuthUserRepository.sendEmailVerificationCode).mockRejectedValue(new Error('Erro ao enviar o email'))

        const response = await request(app).post(route).send(defaultBody)

        expect(response.status).toBe(429)
        expect(response.body).toMatchObject({
            success: false
        })
    })
})