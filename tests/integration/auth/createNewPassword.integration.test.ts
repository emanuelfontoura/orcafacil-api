import { redis } from "@/lib/redis";
import { describe, expect, it, beforeEach, afterAll, beforeAll } from 'vitest'
import express from 'express'
import { authUserRoutes } from "@/modules/auth/auth.route";
import { handleError } from "@/middlewares/handleError";
import request from 'supertest'
import { ArgonHash } from "@/shared/utils/ArgonHash";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

describe('POST auth/password-recovery/new-password', () => {
    const body = {
        tokenUUID: randomUUID(),
        newPassword: '12345678',
        confirmNewPassword: '12345678'
    }
    const key = `recovery-password-${body.tokenUUID}`
    let app: any
    let defaultUser: any
    const route = '/user/auth/password-recovery/new-password'

    beforeAll(() => {
        app = express()
        app.use(express.json())
        app.use('/user/auth', authUserRoutes)
        app.use(handleError)
    })

    beforeEach(async () => {
        await prisma.user.deleteMany()
        await redis.flushall()

        defaultUser = await prisma.user.create({
            data: {
                email: 'teste@gmail.com',
                name: 'Teste',
                password: 'senha-antiga'
            }
        })

        await redis.set(
            key,
            JSON.stringify({
                id: defaultUser.id,
                code: 'hashed-code',
                authorized: true,
                attempts: 1
            })
        )
    })

    afterAll(async () => {
        //await prisma.$disconnect()
        await redis.quit()
    })

    it('deveria criar uma nova senha para o usuário com sucesso', async () => {
        const response = await request(app).post(route).send(body)

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
            success: true,
            data: null
        })
        const user = await prisma.user.findUnique({where: {id: defaultUser.id}})
        expect(user).not.toBeNull()
        const isValidPassword = await ArgonHash.argonVerify(user!.password, body.newPassword)
        expect(isValidPassword).toBe(true)
        expect(user!.password).not.toBe(defaultUser.password)
    })
})