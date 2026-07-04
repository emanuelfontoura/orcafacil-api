import request from "supertest"
import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import express from "express"
import { AuthUserRoutes } from "@/modules/auth/auth.route"
import { handleError } from "@/middlewares/handleError"
import { ErrorCode } from "@/shared/errors/ErrorCodes"
import { ArgonHash } from "@/shared/utils/ArgonHash"
import { randomUUID } from "crypto"

describe("E2E test - AuthUserService - createNewPassword - POST /user/auth/password-recovery/new-password", () => {
    let app: ReturnType<typeof express>
    const route = "/user/auth/password-recovery/new-password"
    const defaultPassword = "12345678"
    const newPassword = "novaSenha123"

    let testUser: { id: number; email: string }

    async function createTestUser() {
        const hashedPassword = await ArgonHash.argonHash(defaultPassword)
        return prisma.user.create({
            data: {
                name: "Emanuel",
                email: "newpassword-test@gmail.com",
                password: hashedPassword
            }
        })
    }

    /**
     * Simula o estado do Redis após confirmCodeRecovery ter sido executado com sucesso.
     * Cria uma chave `recovery-password-{tokenUUID}` com `authorized: true`.
     */
    async function createAuthorizedRecoveryToken(userId: number): Promise<string> {
        const tokenUUID = randomUUID()
        const hashedCode = await ArgonHash.argonHash("123456")

        await redis.set(
            `recovery-password-${tokenUUID}`,
            JSON.stringify({
                id: userId,
                code: hashedCode,
                authorized: true,
                attempts: 1
            }),
            "EX",
            600
        )

        return tokenUUID
    }

    /**
     * Cria uma chave de recovery NÃO autorizada (authorized: false),
     * simulando o estado antes de confirmCodeRecovery.
     */
    async function createUnauthorizedRecoveryToken(userId: number): Promise<string> {
        const tokenUUID = randomUUID()
        const hashedCode = await ArgonHash.argonHash("123456")

        await redis.set(
            `recovery-password-${tokenUUID}`,
            JSON.stringify({
                id: userId,
                code: hashedCode,
                authorized: false,
                attempts: 0
            }),
            "EX",
            600
        )

        return tokenUUID
    }

    beforeEach(async () => {
        app = express()
        app.use(express.json())
        app.use("/user/auth", AuthUserRoutes)
        app.use(handleError)

        await prisma.user.deleteMany({ where: { email: "newpassword-test@gmail.com" } })

        const recoveryKeys = await redis.keys("recovery-password-*")
        if (recoveryKeys.length > 0) await redis.del(...recoveryKeys)

        const rateLimitKeys = await redis.keys("rate-limit-auth/password-recovery/new-password*")
        if (rateLimitKeys.length > 0) await redis.del(...rateLimitKeys)

        testUser = await createTestUser()
    })

    afterAll(async () => {
        await prisma.$disconnect()
        await redis.quit()
    })

    // ──────────────────────────────────────────────
    // Cenários de sucesso
    // ──────────────────────────────────────────────

    it("deve alterar a senha com sucesso e retornar 200", async () => {
        const tokenUUID = await createAuthorizedRecoveryToken(testUser.id)

        const response = await request(app).post(route).send({
            tokenUUID,
            newPassword,
            confirmNewPassword: newPassword
        })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toBeNull()
    })

    it("deve atualizar o hash da senha no banco de dados", async () => {
        const tokenUUID = await createAuthorizedRecoveryToken(testUser.id)

        const userBefore = await prisma.user.findUnique({ where: { id: testUser.id } })
        const oldPasswordHash = userBefore!.password

        await request(app).post(route).send({
            tokenUUID,
            newPassword,
            confirmNewPassword: newPassword
        })

        const userAfter = await prisma.user.findUnique({ where: { id: testUser.id } })
        expect(userAfter!.password).not.toBe(oldPasswordHash)
    })

    it("deve permitir login com a nova senha após a alteração", async () => {
        const tokenUUID = await createAuthorizedRecoveryToken(testUser.id)

        await request(app).post(route).send({
            tokenUUID,
            newPassword,
            confirmNewPassword: newPassword
        })

        const userAfter = await prisma.user.findUnique({ where: { id: testUser.id } })
        const passwordMatch = await ArgonHash.argonVerify(userAfter!.password, newPassword)
        expect(passwordMatch).toBe(true)
    })

    it("não deve mais permitir verificação com a senha antiga", async () => {
        const tokenUUID = await createAuthorizedRecoveryToken(testUser.id)

        await request(app).post(route).send({
            tokenUUID,
            newPassword,
            confirmNewPassword: newPassword
        })

        const userAfter = await prisma.user.findUnique({ where: { id: testUser.id } })
        const oldPasswordMatch = await ArgonHash.argonVerify(userAfter!.password, defaultPassword)
        expect(oldPasswordMatch).toBe(false)
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

    it("deve retornar 400 quando o tokenUUID não for um UUID válido", async () => {
        const response = await request(app).post(route).send({
            tokenUUID: "token-invalido",
            newPassword,
            confirmNewPassword: newPassword
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    it("deve retornar 400 quando as senhas não coincidirem", async () => {
        const tokenUUID = await createAuthorizedRecoveryToken(testUser.id)

        const response = await request(app).post(route).send({
            tokenUUID,
            newPassword,
            confirmNewPassword: "senhadiferente123"
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    it("deve retornar 400 quando a senha tiver menos de 8 caracteres", async () => {
        const tokenUUID = await createAuthorizedRecoveryToken(testUser.id)

        const response = await request(app).post(route).send({
            tokenUUID,
            newPassword: "1234567",
            confirmNewPassword: "1234567"
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    it("deve retornar 400 quando a newPassword estiver ausente", async () => {
        const tokenUUID = await createAuthorizedRecoveryToken(testUser.id)

        const response = await request(app).post(route).send({
            tokenUUID,
            confirmNewPassword: newPassword
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    it("deve retornar 400 quando o confirmNewPassword estiver ausente", async () => {
        const tokenUUID = await createAuthorizedRecoveryToken(testUser.id)

        const response = await request(app).post(route).send({
            tokenUUID,
            newPassword
        })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
    })

    // ──────────────────────────────────────────────
    // Cenários de regras de negócio
    // ──────────────────────────────────────────────

    it("deve retornar 401 quando o tokenUUID não existir no Redis", async () => {
        const fakeTokenUUID = randomUUID()

        const response = await request(app).post(route).send({
            tokenUUID: fakeTokenUUID,
            newPassword,
            confirmNewPassword: newPassword
        })

        expect(response.status).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.code).toBe(ErrorCode.INVALID_TOKEN)
    })

    it("deve retornar 401 quando o token não estiver autorizado (authorized: false)", async () => {
        const tokenUUID = await createUnauthorizedRecoveryToken(testUser.id)

        const response = await request(app).post(route).send({
            tokenUUID,
            newPassword,
            confirmNewPassword: newPassword
        })

        expect(response.status).toBe(401)
        expect(response.body.success).toBe(false)
        expect(response.body.code).toBe(ErrorCode.UNAUTHORIZED_USER)
    })

    it("não deve alterar a senha no banco quando o token não for autorizado", async () => {
        const tokenUUID = await createUnauthorizedRecoveryToken(testUser.id)

        const userBefore = await prisma.user.findUnique({ where: { id: testUser.id } })

        await request(app).post(route).send({
            tokenUUID,
            newPassword,
            confirmNewPassword: newPassword
        })

        const userAfter = await prisma.user.findUnique({ where: { id: testUser.id } })
        expect(userAfter!.password).toBe(userBefore!.password)
    })

    it("não deve alterar a senha no banco quando o tokenUUID for inválido", async () => {
        const userBefore = await prisma.user.findUnique({ where: { id: testUser.id } })

        await request(app).post(route).send({
            tokenUUID: randomUUID(),
            newPassword,
            confirmNewPassword: newPassword
        })

        const userAfter = await prisma.user.findUnique({ where: { id: testUser.id } })
        expect(userAfter!.password).toBe(userBefore!.password)
    })

    // ──────────────────────────────────────────────
    // Rate Limiting (middleware)
    // ──────────────────────────────────────────────

    it("deve retornar 429 ao exceder o rate limit da rota", async () => {
        // A rota permite no máximo 3 requisições por minuto (rateLimit(3, 60, ...))
        for (let i = 0; i < 3; i++) {
            const tokenUUID = await createAuthorizedRecoveryToken(testUser.id)
            const res = await request(app).post(route).send({
                tokenUUID,
                newPassword,
                confirmNewPassword: newPassword
            })
            expect(res.status).toBe(200)
        }

        // 4ª requisição deve ser bloqueada pelo rate limiter
        const tokenUUID = await createAuthorizedRecoveryToken(testUser.id)
        const blockedResponse = await request(app).post(route).send({
            tokenUUID,
            newPassword,
            confirmNewPassword: newPassword
        })

        expect(blockedResponse.status).toBe(429)
        expect(blockedResponse.body.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED)
    })
})