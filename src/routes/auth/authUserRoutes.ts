import { Router } from "express";
import { AuthUserController } from '../../controllers/auth/authUserController'

const userAuthRouter = Router()

userAuthRouter.post('/email/verify', AuthUserController.verifyEmail)
userAuthRouter.post('/email/confirm', AuthUserController.confirmEmail)

export { userAuthRouter }