import { Router } from "express";
import { AuthUserController } from './auth.controller'
import { validateSchema } from "../../middlewares/validate";
import { authSchemas } from "./auth.schema"
import { rateLimit } from "../../middlewares/rateLimit";

const authUserRoutes = Router()

authUserRoutes.post('/email/verify', rateLimit(3, 60, 'auth/email/verify'), validateSchema(authSchemas.verifyEmailSchema), AuthUserController.verifyEmail)
authUserRoutes.post('/email/confirm', rateLimit(3, 60, 'auth/email/confirm'), validateSchema(authSchemas.confirmEmailSchema), AuthUserController.confirmEmail)

export { authUserRoutes }