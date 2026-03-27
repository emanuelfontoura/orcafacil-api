import { Request, Response } from "express";
import { AuthUserService } from "../../services/auth/authUserService";
import { VerifyEmailRequestDTO, VerifyEmailResponseDTO } from "../../dtos/auth/verify-email.dto"
import { ConfirmEmailRequestDTO, ConfirmEmailResponseDTO } from "../../dtos/auth/confirm-email.dto"
import { ApiResponse } from "../../types/api-response";
import { z } from "zod"

export class AuthUserController {

    static async verifyEmail(req: Request, res: Response<ApiResponse<VerifyEmailResponseDTO>>){
        const createAuthSchema = z.object({
            email: z.email(),
            name: z.string(),
            password: z.string().min(6),
            confirmPassword: z.string().min(6)
        })

        const data: VerifyEmailRequestDTO = createAuthSchema.parse(req.body)
        const {email, name, password, confirmPassword} = data

        try{
            const dataUser = await AuthUserService.verifyEmail(
                {email, name, password, confirmPassword}
            )
            res.status(200).json({
                success: true,
                data: dataUser
            })
        }catch(error){
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno do sistema. Entre em contato!'
            })
        }

    }

    static async confirmEmail(req: Request, res: Response<ApiResponse<ConfirmEmailResponseDTO>>){
        const createAuthSchema = z.object({
            email: z.email(),
            code: z.string().min(6)
        })

        const data: ConfirmEmailRequestDTO = createAuthSchema.parse(req.body)
        const {email, code} = data

        try{
            const user: ConfirmEmailResponseDTO = await AuthUserService.confirmEmail({email, code})
            res.status(200).json({
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    createdAt: user.createdAt
                }
            })
        }catch(error){
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno do sistema. Entre em contato!'
            })
        }
    }

}