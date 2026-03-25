import { Request, Response } from "express";
import { AuthUserService } from "services/auth/authUserService";

export class AuthUserController {

    static async verifyEmail(req: Request, res: Response){
        const {email, name, password, confirmPassword} = req.body

        try{
            const dataUser = await AuthUserService.verifyEmail(
                {email, name, password, confirmPassword}
            )
            res.status(200).json({
                dataUser
            })
        }catch(error){
            res.status(500).json({
                message: error instanceof Error ? error.message : 'Erro interno do sistema. Entre em contato!'
            })
        }

    }

    static async confirmEmail(req: Request, res: Response){
        //
    }

}