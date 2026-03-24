import { Request, Response } from "express";
import { AuthUserService } from "services/auth/authUserService";

export class AuthUserController {

    static async verifyEmail(req: Request, res: Response){
        const {email, name, password, confirmPassword} = req.body

        const emailSent = AuthUserService.verifyEmail(
            {email, name, password, confirmPassword}
        )

    }

    static async confirmEmail(req: Request, res: Response){
        //
    }

}