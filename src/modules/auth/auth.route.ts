import { Router } from "express";
import { validateSchema } from "@/middlewares/validate";
import { authSchemas } from "@/modules/auth/auth.schema"
import { Container } from "@/container";

type AuthUserRoutesDeps = Pick<Container, 'authUserController' | 'rateLimit'>

export function createAuthUserRoutes({authUserController, rateLimit}: AuthUserRoutesDeps): Router{
    const router = Router()

    router.post(
        '/email/verify',
        rateLimit({maxReqLimit: 2, maxTimeLimit: 60, route: 'auth/email/verify'}),
        authUserController.verifyEmail
    )

    router.post(
        '/email/confirm',
        rateLimit({maxReqLimit: 5, maxTimeLimit: 60, route: 'auth/email/confirm'}),
        authUserController.confirmEmail
    )

    router.post(
        '/email/resend-email-code',
        rateLimit({maxReqLimit: 1, maxTimeLimit: 60, route: 'auth/email/resend-email-code'}),
        validateSchema(authSchemas.resendCodeEmailSchema),
        authUserController.resendEmailCode
    )

    router.post(
        '/login',
        rateLimit({maxReqLimit: 5, maxTimeLimit: 60, route: 'auth/login'}),
        validateSchema(authSchemas.loginSchema),
        authUserController.login
    )

    router.post(
        '/refresh-token',
        rateLimit({maxReqLimit: 10, maxTimeLimit: 60, route: 'auth/refresh-token'}),
        authUserController.refreshToken
    )

    router.post(
        '/password-recovery/send-code',
        rateLimit({maxReqLimit: 1, maxTimeLimit: 60, route: 'auth/password-recovery/send-code'}),
        validateSchema(authSchemas.sendCodeRecoverySchema),
        authUserController.sendCodeRecovery
    )

    router.post(
        '/password-recovery/confirm-code',
        rateLimit({maxReqLimit: 10, maxTimeLimit: 60, route: 'auth/password-recovery/confirm-code'}),
        validateSchema(authSchemas.confirmCodeRecoverySchema), 
        authUserController.confirmCodeRecovery
    )

    router.post(
        '/password-recovery/new-password',
        rateLimit({maxReqLimit: 3, maxTimeLimit: 60, route: 'auth/password-recovery/new-password'}),
        validateSchema(authSchemas.createNewPasswordSchema), 
        authUserController.createNewPassword
    )

    router.post(
        '/logout',
        rateLimit({maxReqLimit: 1, maxTimeLimit: 60, route: 'auth/logout'}),
        validateSchema(authSchemas.createNewPasswordSchema), 
        authUserController.logout
    )

    return router
}