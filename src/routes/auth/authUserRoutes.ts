import { Router } from "express";
import { AuthUserController } from '../../controllers/auth/authUserController'

const authUserRoutes = Router()

authUserRoutes.post('/email/verify', AuthUserController.verifyEmail)
authUserRoutes.post('/email/confirm', AuthUserController.confirmEmail)

export { authUserRoutes }