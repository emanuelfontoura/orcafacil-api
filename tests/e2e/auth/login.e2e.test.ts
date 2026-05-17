import request from "supertest"
import jwt from "jsonwebtoken"
import { describe, it, expect, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import express from 'express'
import { ArgonHash } from "@/shared/utils/ArgonHash"
import { authUserRoutes } from "@/modules/auth/auth.route"
import { handleError } from "@/middlewares/handleError"

describe("E2E POST /auth/login", () => {
    let app: any
    const route = '/user/auth/login'

    beforeEach(async () => {
        await prisma.user.deleteMany()

        app = express()
        app.use(express.json())
        app.use('/user/auth', authUserRoutes)
        app.use(handleError)

        const keys = await redis.keys("refresh-token-*")

        if(keys.length > 0){
            await redis.del(keys)
        }
    })

    it("deveria realizar login completo", async () => {
        const hashedPassword = await ArgonHash.argonHash("123456")

        const user = await prisma.user.create({
            data: {
                name: "Emanuel",
                email: "emanuel@gmail.com",
                password: hashedPassword
            }
        })

        const response = await request(app).post(route).send({
            email: "teste@gmail.com",
            password: "123456"
        })

        expect(response.status).toBe(200)

        const rawCookies = response.headers["set-cookie"]

        const cookies = rawCookies ? Array.isArray(rawCookies) ? rawCookies : [rawCookies] : []

        expect(cookies).toBeDefined()

        const accessCookie = cookies.find((c: string) =>
            c.startsWith("accessToken")
        )

        const refreshCookie = cookies.find((c: string) =>
            c.startsWith("refreshToken")
        )

        expect(accessCookie).toBeTruthy()
        expect(refreshCookie).toBeTruthy()

        const refreshToken = refreshCookie.split(";")[0].split("=")[1]

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET!
        ) as jwt.JwtPayload

        expect(decoded.sub).toBe(user.id)

        const redisValue = await redis.get(
            `refresh-token-${decoded.jti}`
        )

        expect(redisValue).toBe(String(user.id))
    })
})