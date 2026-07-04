// -------------------------

// TESTE E2E GERADO PELA I.A Claude Opus 4.6

// -------------------------

import request from "supertest"
import jwt from "jsonwebtoken"
import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import express from 'express'
import { ArgonHash } from "@/shared/utils/ArgonHash"
import { AuthUserRoutes } from "@/modules/auth/auth.route"
import { handleError } from "@/middlewares/handleError"
import { ErrorCode } from "@/shared/errors/ErrorCodes"

describe("E2E test - AuthUserService - login - POST /user/auth/login", () => {
    let app: ReturnType<typeof express>
    const route = '/user/auth/login'
    const defaultPassword = '12345678'
    const defaultEmail = 'login-test@gmail.com'

    async function createTestUser(overrides?: { email?: string; password?: string; name?: string }) {
        const password = overrides?.password ?? defaultPassword
        const hashedPassword = await ArgonHash.argonHash(password)

        return prisma.user.create({
            data: {
                name: overrides?.name ?? 'Emanuel',
                email: overrides?.email ?? defaultEmail,
                password: hashedPassword
            }
        })
    }

    beforeEach(async () => {
        app = express()
        app.use(express.json())
        app.use('/user/auth', AuthUserRoutes)
        app.use(handleError)

        await prisma.user.deleteMany({ where: { email: defaultEmail } })

        const refreshKeys = await redis.keys("refresh-token-*")
        if (refreshKeys.length > 0) await redis.del(...refreshKeys)

        const rateLimitKeys = await redis.keys("rate-limit-auth/login*")
        if (rateLimitKeys.length > 0) await redis.del(...rateLimitKeys)
    })

    afterAll(async () => {
        await prisma.$disconnect()
        await redis.quit()
    })

    // ──────────────────────────────────────────────
    // Cenários de sucesso
    // ──────────────────────────────────────────────

    it("deveria realizar login com sucesso e retornar cookies de autenticação", async () => {
        await createTestUser()

        const response = await request(app).post(route).send({
            email: defaultEmail,
            password: defaultPassword
        })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toBeNull()
    })

    it("deve retornar accessToken e refreshToken nos cookies", async () => {
        await createTestUser()

        const response = await request(app).post(route).send({
            email: defaultEmail,
            password: defaultPassword
        })

        const rawCookies = response.headers["set-cookie"]
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies]

        const accessCookie = cookies.find((c: string) => c.startsWith("accessToken"))
        const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken"))

        expect(accessCookie).toBeTruthy()
        expect(refreshCookie).toBeTruthy()
    })

    it("deve configurar cookies como httpOnly", async () => {
        await createTestUser()

        const response = await request(app).post(route).send({
            email: defaultEmail,
            password: defaultPassword
        })

        const rawCookies = response.headers["set-cookie"]
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies]

        const accessCookie = cookies.find((c: string) => c.startsWith("accessToken"))
        const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken"))

        expect(accessCookie).toContain("HttpOnly")
        expect(refreshCookie).toContain("HttpOnly")
    })

    it("deve gerar um refreshToken JWT válido com sub = userId", async () => {
        const user = await createTestUser()

        const response = await request(app).post(route).send({
            email: defaultEmail,
            password: defaultPassword
        })

        const rawCookies = response.headers["set-cookie"]
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies]
        const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken"))

        const refreshToken = refreshCookie!.split(";")[0].split("=")[1]

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET!
        ) as jwt.JwtPayload

        expect(decoded.sub).toBe(user.id)
        expect(decoded.jti).toBeDefined()
    })

    it("deve gerar um accessToken JWT válido com sub = userId", async () => {
        const user = await createTestUser()

        const response = await request(app).post(route).send({
            email: defaultEmail,
            password: defaultPassword
        })

        const rawCookies = response.headers["set-cookie"]
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies]
        const accessCookie = cookies.find((c: string) => c.startsWith("accessToken"))

        const accessToken = accessCookie!.split(";")[0].split("=")[1]

        const decoded = jwt.verify(
            accessToken,
            process.env.JWT_ACCESS_SECRET!
        ) as jwt.JwtPayload

        expect(decoded.sub).toBe(user.id)
    })

    it("deve salvar o refresh token no Redis com o userId", async () => {
        const user = await createTestUser()

        const response = await request(app).post(route).send({
            email: defaultEmail,
            password: defaultPassword
        })

        const rawCookies = response.headers["set-cookie"]
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies]
        const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken"))

        const refreshToken = refreshCookie!.split(";")[0].split("=")[1]
        const decoded = jwt.decode(refreshToken) as jwt.JwtPayload

        const redisValue = await redis.get(`refresh-token-${decoded.jti}`)
        expect(redisValue).toBe(String(user.id))
    })

    // ──────────────────────────────────────────────
    // Cenários de validação (Zod schema)
    // ──────────────────────────────────────────────

    it("deve retornar 400 quando o body estiver vazio", async () => {
        const response = await request(app).post(route).send({})

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
        expect(response.body.details).toBeDefined()
        expect(response.body.details!.length).toBeGreaterThan(0)
    })

    it("deve retornar 400 quando o email for inválido", async () => {
        const response = await request(app).post(route).send({
            email: 'email-invalido',
            password: defaultPassword
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    it("deve retornar 400 quando a senha tiver menos de 8 caracteres", async () => {
        const response = await request(app).post(route).send({
            email: defaultEmail,
            password: '1234567'
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    it("deve retornar 400 quando o email estiver ausente", async () => {
        const response = await request(app).post(route).send({
            password: defaultPassword
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    it("deve retornar 400 quando a senha estiver ausente", async () => {
        const response = await request(app).post(route).send({
            email: defaultEmail
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    // ──────────────────────────────────────────────
    // Cenários de regras de negócio
    // ──────────────────────────────────────────────

    it("deve retornar 401 quando o email não estiver cadastrado", async () => {
        const response = await request(app).post(route).send({
            email: 'naoexiste@gmail.com',
            password: defaultPassword
        })

        expect(response.status).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.code).toBe(ErrorCode.INVALID_CREDENTIALS)
    })

    it("deve retornar 401 quando a senha estiver incorreta", async () => {
        await createTestUser()

        const response = await request(app).post(route).send({
            email: defaultEmail,
            password: 'senhaerrada123'
        })

        expect(response.status).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.code).toBe(ErrorCode.INVALID_CREDENTIALS)
    })

    it("não deve salvar refresh token no Redis quando as credenciais são inválidas", async () => {
        await createTestUser()

        await request(app).post(route).send({
            email: defaultEmail,
            password: 'senhaerrada123'
        })

        const keys = await redis.keys("refresh-token-*")
        expect(keys.length).toBe(0)
    })

    it("não deve retornar cookies quando as credenciais são inválidas", async () => {
        await createTestUser()

        const response = await request(app).post(route).send({
            email: defaultEmail,
            password: 'senhaerrada123'
        })

        const rawCookies = response.headers["set-cookie"]
        expect(rawCookies).toBeUndefined()
    })

    // ──────────────────────────────────────────────
    // Rate Limiting (middleware)
    // ──────────────────────────────────────────────

    it("deve retornar 429 ao exceder o rate limit da rota", async () => {
        await createTestUser()

        const loginBody = { email: defaultEmail, password: defaultPassword }

        // A rota permite no máximo 5 requisições por minuto (rateLimit(5, 60, ...))
        for (let i = 0; i < 5; i++) {
            const res = await request(app).post(route).send(loginBody)
            expect(res.status).toBe(200)
        }

        // 6ª requisição deve ser bloqueada pelo rate limiter
        const blockedResponse = await request(app).post(route).send(loginBody)
        expect(blockedResponse.status).toBe(429)
        expect(blockedResponse.body.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED)
    })
})