import request from "supertest"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { prisma } from "@/lib/prisma"
import { ArgonHash } from "@/shared/utils/ArgonHash"
import * as tokens from "@/shared/utils/generateTokens"
import express from 'express'
import { authUserRoutes } from "@/modules/auth/auth.route"
import { handleError } from "@/middlewares/handleError"
import { ErrorCode } from "@/shared/errors/ErrorCodes"

describe("POST /auth/login", () => {
    const route = '/user/auth/login'
    let app: any

    beforeEach(async () => {
        await prisma.user.deleteMany()

        vi.restoreAllMocks()

        app = express()
        app.use(express.json())
        app.use('/user/auth', authUserRoutes)
        app.use(handleError)
    })

    it("deveria realizar login com sucesso", async () => {
        const hashedPassword = await ArgonHash.argonHash("123456")

        await prisma.user.create({
            data: {
                name: "teste",
                email: "teste@gmail.com",
                password: hashedPassword
            }
        })

        vi.spyOn(crypto, "randomUUID")
            .mockReturnValue("3181d0e7-b884-4f0f-b233-324e9ae9e180")

        vi.spyOn(tokens, "generateTokens").mockResolvedValue({
            accessToken: "fake-access-token",
            refreshToken: "fake-refresh-token"
        })

        const response = await request(app).post(route).send({
            email: "teste@gmail.com",
            password: "12345678"
        })

        expect(response.status).toBe(200)

        expect(response.body).toEqual({
            success: true,
            data: null
        })

        expect(response.headers["set-cookie"]).toBeDefined()

        const cookies = response.headers["set-cookie"]

        expect(cookies[0]).toContain("accessToken=fake-access-token")
        expect(cookies[1]).toContain("refreshToken=fake-refresh-token")
    })

    it("deveria retornar erro caso email não exista", async () => {
        const response = await request(app).post(route).send({
            email: "naoexiste@gmail.com",
            password: "12345678"
        })

        expect(response.status).toBe(401)

        expect(response.body).toMatchObject({
            success: false,
            code: ErrorCode.INVALID_CREDENTIALS
        })
    })

    it("deveria retornar erro caso senha esteja incorreta", async () => {
        const hashedPassword = await ArgonHash.argonHash("123456")

        await prisma.user.create({
            data: {
                name: "teste",
                email: "teste@gmail.com",
                password: hashedPassword
            }
        })

        const response = await request(app).post(route).send({
            email: "teste@gmail.com",
            password: "senha-errada"
        })

        expect(response.status).toBe(401)

        expect(response.body).toMatchObject({
            success: false,
            code: ErrorCode.INVALID_CREDENTIALS
        })
    })

    it("deveria atualizar hash caso needsRehash retorne true", async () => {
        const hashedPassword = await ArgonHash.argonHash("123456")

        const user = await prisma.user.create({
            data: {
                name: "teste",
                email: "teste@gmail.com",
                password: hashedPassword
            }
        })

        vi.spyOn(ArgonHash, "argonRehash").mockResolvedValue("novo-hash")

        const updateSpy = vi.spyOn(prisma.user, "update")

        await request(app).post(route).send({
            email: "teste@gmail.com",
            password: "12345678"
        })

        expect(updateSpy).toHaveBeenCalledWith({
            where: {
                id: user.id
            },
            data: {
                password: "novo-hash"
            }
        })
    })
})