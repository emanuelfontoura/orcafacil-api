import { Request, Response } from "express";
import { AuthUserService } from "services/auth/authUserService";
import { email, z } from "zod"

export class AuthUserController {

    static async verifyEmail(req: Request, res: Response){
        const createAuthSchema = z.object({
            email: z.email(),
            name: z.string(),
            password: z.string().min(6),
            confirmPassword: z.string().min(6)
        })
        const {email, name, password, confirmPassword} = createAuthSchema.parse(req.body)

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
        const createAuthSchema = z.object({
            email: z.email(),
            code: z.string().min(6)
        })
        const {email, code} = createAuthSchema.parse(req.body)

        try{
            const user = await AuthUserService.confirmEmail({email, code})
            res.status(200).json({
                id: user.id,
                email: user.email,
                name: user.name
            })
        }catch(error){
            res.status(500).json({
                message: error instanceof Error ? error.message : 'Erro interno do sistema. Entre em contato!'
            })
        }
    }

}