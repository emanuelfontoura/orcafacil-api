import { authUserRoutes } from "@/modules/auth/auth.route";
import request from 'supertest'
import express from 'express'
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { handleError } from "@/middlewares/handleError";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { AuthUserRepository } from "@/modules/auth/auth.repository";
import { ErrorCode } from "@/shared/errors/ErrorCodes";

vi.mock('@/modules/auth/auth.repository', () => {
    return {
        sendEmailVerificationCode: vi.fn()
    }
})

describe('E2E test - AuthUserService - verifyEmail - POST user/auth/email/verify', () => {
    let app: any
    const defaultBody = {
        email: 'teste@gmail.com',
        name: 'Teste',
        password: '12345678',
        confirmPassword: '12345678'
    }
    const route = '/user/auth/email/verify'

    beforeEach(async () => {
        vi.clearAllMocks()

        app = express()
        app.use(express.json())
        app.use('/user/auth', authUserRoutes)
        app.use(handleError)

        await prisma.user.deleteMany()
        const keys = await redis.keys('verify-email*')
        if (keys.length > 0) await redis.del(...keys)

        vi.mocked(AuthUserRepository.sendEmailVerificationCode).mockResolvedValue()
    })

    afterAll(async () => {
        prisma.$disconnect
        redis.quit()
    })

    it('deve retornar 200 com dados válidos', async () => {
        const response = await request(app).post(route).send(defaultBody)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toEqual({
            email: defaultBody.email,
            name: defaultBody.name
        })
    })

    it('deveria impedir cadastro com email já existente', async () => {
        await prisma.user.create({
            data: {
                email: 'teste@gmail.com',
                name: 'teste',
                password: '12345678'
            }
        })

        const response = await request(app).post(route).send(defaultBody)
        expect(response.status).toBe(409)
        expect(response.body.code).toBe(ErrorCode.USER_ALREADY_EXISTS)
    })

    it('deveria bloquear múltiplas requisições consecutivas', async () => {
        const firstRequest = await request(app).post(route).send(defaultBody)
        expect(firstRequest.status).toBe(200)
        const secondRequest = await request(app).post(route).send(defaultBody)
        expect(secondRequest.status).toBe(400)
        expect(secondRequest.body.code).toBe(ErrorCode.LIMIT_ATTEMPTS)
    })
})