import { authUserRoutes } from "@/modules/auth/auth.route";
import request from 'supertest'
import express from 'express'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleError } from "@/middlewares/handleError";

const defaultBody = {
    email: 'teste@gmail.com',
    name: 'Teste',
    password: '12345678',
    confirmPassword: '12345678'
}

describe('E2E test - AuthUserService - verifyEmail - POST user/auth/email/verify', () => {
    let app: any

    beforeEach(() => {
        app = express()
        app.use(express.json())
        app.use('/user/auth', authUserRoutes)
        app.use(handleError)
    })

    it('deve retornar 200 com dados válidos', async () => {
        const response = await request(app)
            .post('/email/verify')
            .send(defaultBody)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toEqual({
            email: defaultBody.email,
            name: defaultBody.name
        })
    })
})