import { Router } from "express";
import { AuthUserController } from '@/modules/auth/auth.controller'
import { validateSchema } from "@/middlewares/validate";
import { authSchemas } from "@/modules/auth/auth.schema"
import { rateLimit } from "@/middlewares/rateLimit";

const authUserRoutes = Router()

authUserRoutes.post('/email/verify', rateLimit(2, 60, 'auth/email/verify'), validateSchema(authSchemas.verifyEmailSchema), AuthUserController.verifyEmail)
authUserRoutes.post('/email/confirm', rateLimit(5, 60, 'auth/email/confirm'), validateSchema(authSchemas.confirmEmailSchema), AuthUserController.confirmEmail)
authUserRoutes.post('/email/resend-email-code', rateLimit(1, 60, 'auth/email/resend-email-code'), validateSchema(authSchemas.resendCodeEmailSchema), AuthUserController.resendEmailCode)
authUserRoutes.post('/login', rateLimit(5, 60, 'auth/login'), validateSchema(authSchemas.loginSchema), AuthUserController.login)
authUserRoutes.post('/refresh-token', rateLimit(10, 60, 'auth/refresh-token'), AuthUserController.refreshToken)
authUserRoutes.post(
    '/password-recovery/send-code', 
    rateLimit(1, 60, 'auth/password-recovery/send-code'), 
    validateSchema(authSchemas.sendCodeRecoverySchema), 
    AuthUserController.sendCodeRecovery
)
authUserRoutes.post(
    '/password-recovery/confirm-code', 
    rateLimit(10, 60, 'auth/password-recovery/confirm-code'), 
    validateSchema(authSchemas.confirmCodeRecoverySchema), 
    AuthUserController.confirmCodeRecovery
)
authUserRoutes.post(
    '/password-recovery/new-password',
    rateLimit(3, 60, 'auth/password-recovery/new-password'),
    validateSchema(authSchemas.createNewPasswordSchema),
    AuthUserController.createNewPassword
)

export { authUserRoutes }