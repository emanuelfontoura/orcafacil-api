// -------------------------

// TESTE E2E GERADO PELA I.A Claude Opus 4.6

// -------------------------

import { AuthUserRoutes } from "@/modules/auth/auth.route";
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
        AuthUserRepository: {
            sendEmailVerificationCode: vi.fn()
        }
    }
})

describe('E2E test - AuthUserService - verifyEmail - POST user/auth/email/verify', () => {
    let app: ReturnType<typeof express>
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
        app.use('/user/auth', AuthUserRoutes)
        app.use(handleError)

        await prisma.user.deleteMany({ where: { email: defaultBody.email } })

        const verifyKeys = await redis.keys('verify-email*')
        if (verifyKeys.length > 0) await redis.del(...verifyKeys)

        const rateLimitKeys = await redis.keys('rate-limit-auth/email/verify*')
        if (rateLimitKeys.length > 0) await redis.del(...rateLimitKeys)

        vi.mocked(AuthUserRepository.sendEmailVerificationCode).mockResolvedValue()
    })

    afterAll(async () => {
        await prisma.$disconnect()
        await redis.quit()
    })

    // ──────────────────────────────────────────────
    // Cenários de sucesso
    // ──────────────────────────────────────────────

    it('deve retornar 200 com dados válidos', async () => {
        const response = await request(app).post(route).send(defaultBody)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toEqual({
            email: defaultBody.email,
            name: defaultBody.name
        })
    })

    it('deve retornar a estrutura correta da ApiResponse', async () => {
        const response = await request(app).post(route).send(defaultBody)

        expect(response.body).toHaveProperty('success')
        expect(response.body).toHaveProperty('data')
        expect(response.body).not.toHaveProperty('error')
        expect(response.body).not.toHaveProperty('code')
    })

    it('deve salvar os dados de verificação no Redis', async () => {
        await request(app).post(route).send(defaultBody)

        const redisData = await redis.get(`verify-email-${defaultBody.email}`)
        expect(redisData).not.toBeNull()

        const parsed = JSON.parse(redisData!)
        expect(parsed).toHaveProperty('code')
        expect(parsed).toHaveProperty('name', defaultBody.name)
        expect(parsed).toHaveProperty('password')
        // Senha e código devem estar hasheados (Argon2), não em texto puro
        expect(parsed.password).not.toBe(defaultBody.password)
        expect(parsed.code).not.toMatch(/^\d{6}$/)
    })

    it('deve criar a chave de cooldown no Redis', async () => {
        await request(app).post(route).send(defaultBody)

        const cooldownExists = await redis.exists(`verify-email-cooldown-${defaultBody.email}`)
        expect(cooldownExists).toBe(1)
    })

    it('deve chamar sendEmailVerificationCode com o email correto', async () => {
        await request(app).post(route).send(defaultBody)

        expect(AuthUserRepository.sendEmailVerificationCode).toHaveBeenCalledTimes(1)
        expect(AuthUserRepository.sendEmailVerificationCode).toHaveBeenCalledWith(
            expect.objectContaining({
                email: defaultBody.email,
                code: expect.stringMatching(/^\d{6}$/)
            })
        )
    })

    // ──────────────────────────────────────────────
    // Cenários de validação (Zod schema)
    // ──────────────────────────────────────────────

    it('deve retornar 400 quando o body estiver vazio', async () => {
        const response = await request(app).post(route).send({})

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
        expect(response.body.details).toBeDefined()
        expect(response.body.details!.length).toBeGreaterThan(0)
    })

    it('deve retornar 400 quando o email for inválido', async () => {
        const response = await request(app).post(route).send({
            ...defaultBody,
            email: 'email-invalido'
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    it('deve retornar 400 quando as senhas não coincidirem', async () => {
        const response = await request(app).post(route).send({
            ...defaultBody,
            confirmPassword: 'senhadiferente'
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    it('deve retornar 400 quando a senha tiver menos de 8 caracteres', async () => {
        const response = await request(app).post(route).send({
            ...defaultBody,
            password: '1234567',
            confirmPassword: '1234567'
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    it('deve retornar 400 quando o nome estiver ausente', async () => {
        const { name, ...bodyWithoutName } = defaultBody
        const response = await request(app).post(route).send(bodyWithoutName)

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    // ──────────────────────────────────────────────
    // Cenários de regras de negócio
    // ──────────────────────────────────────────────

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
        expect(response.body.success).toBe(false)
        expect(response.body.code).toBe(ErrorCode.USER_ALREADY_EXISTS)
    })

    it('deveria bloquear múltiplas requisições consecutivas (cooldown)', async () => {
        const firstRequest = await request(app).post(route).send(defaultBody)
        expect(firstRequest.status).toBe(200)

        const secondRequest = await request(app).post(route).send(defaultBody)
        expect(secondRequest.status).toBe(409)
        expect(secondRequest.body.code).toBe(ErrorCode.LIMIT_ATTEMPTS)
    })

    it('não deve salvar dados no Redis quando o email já existe no banco', async () => {
        await prisma.user.create({
            data: {
                email: 'teste@gmail.com',
                name: 'teste',
                password: '12345678'
            }
        })

        await request(app).post(route).send(defaultBody)

        const redisData = await redis.get(`verify-email-${defaultBody.email}`)
        expect(redisData).toBeNull()
    })

    it('não deve chamar sendEmailVerificationCode quando o email já existe', async () => {
        await prisma.user.create({
            data: {
                email: 'teste@gmail.com',
                name: 'teste',
                password: '12345678'
            }
        })

        await request(app).post(route).send(defaultBody)

        expect(AuthUserRepository.sendEmailVerificationCode).not.toHaveBeenCalled()
    })

    // ──────────────────────────────────────────────
    // Rate Limiting (middleware)
    // ──────────────────────────────────────────────

    it('deve retornar 429 ao exceder o rate limit da rota', async () => {
        // A rota permite no máximo 2 requisições por minuto (rateLimit(2, 60, ...))
        // Precisamos limpar o cooldown entre as requisições para que não seja
        // bloqueado pela lógica de negócio antes de atingir o rate limit
        const firstResponse = await request(app).post(route).send(defaultBody)
        expect(firstResponse.status).toBe(200)

        // Limpar cooldown para permitir segunda requisição de negócio
        await redis.del(`verify-email-cooldown-${defaultBody.email}`)

        const secondResponse = await request(app).post(route).send(defaultBody)
        expect(secondResponse.status).toBe(200)

        // Limpar cooldown novamente
        await redis.del(`verify-email-cooldown-${defaultBody.email}`)

        // Terceira requisição deve ser bloqueada pelo rate limiter
        const thirdResponse = await request(app).post(route).send(defaultBody)
        expect(thirdResponse.status).toBe(429)
        expect(thirdResponse.body.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED)
    })
})