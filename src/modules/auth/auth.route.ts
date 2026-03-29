import { Router } from "express";
import { AuthUserController } from './auth.controller'
import { validateSchema } from "../../middlewares/validate";
import { authSchemas } from "./auth.schema"

const authUserRoutes = Router()

authUserRoutes.post('/email/verify', validateSchema(authSchemas.verifyEmailSchema), AuthUserController.verifyEmail)
authUserRoutes.post('/email/confirm', validateSchema(authSchemas.confirmEmailSchema), AuthUserController.confirmEmail)

export { authUserRoutes }