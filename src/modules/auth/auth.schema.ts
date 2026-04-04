import { z } from "zod"

export const authSchemas = {
    verifyEmailSchema: z.object({
        name: z.string().min(1).max(100),
        email: z.email().max(255),
        password: z.string().min(8).max(128),
        confirmPassword: z.string().min(8).max(128)
    }).refine((data) => data.password === data.confirmPassword, {
        message: 'As senhas não coincidem',
        path: ['confirmPassword']
    }),
    confirmEmailSchema: z.object({
        email: z.email().max(255),
        code: z.string().min(6).max(6).regex(/^\d+$/, 'O código precisa ter 6 dígitos')
    }),
    resendCodeEmailSchema: z.object({
        email: z.email().max(255)
    }),
    loginSchema: z.object({
        email: z.email().max(255),
        password: z.string().min(8).max(128)
    })
}