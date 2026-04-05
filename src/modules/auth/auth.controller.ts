import { NextFunction, Request, Response } from "express";
import { AuthUserService } from "@/modules/auth/auth.service";
import { AuthDTOs } from "@/modules/auth/auth.dtos";
import { ApiResponse } from "@/shared/types/apiResponse";
import { UnauthorizedError } from "@/shared/errors/UnauthorizedError";
import { setAuthCookies } from "@/shared/utils/setAuthCookies";

export class AuthUserController {

    static async verifyEmail(req: Request, res: Response<ApiResponse<AuthDTOs['VerifyEmailResponseDTO']>>, next: NextFunction){
        const data: AuthDTOs['VerifyEmailRequestDTO'] = req.body
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
            next(error)
        }

    }

    static async confirmEmail(req: Request, res: Response<ApiResponse<AuthDTOs['ConfirmEmailResponseDTO']>>, next: NextFunction){
        const data: AuthDTOs['ConfirmEmailRequestDTO'] = req.body
        const {email, code} = data
        try{
            const user: AuthDTOs['ConfirmEmailResponseDTO'] = await AuthUserService.confirmEmail({email, code})
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
            next(error)
        }
    }

    static async resendEmailCode(req: Request, res: Response<ApiResponse<AuthDTOs['ResendEmailCodeDTO']>>, next: NextFunction){
        const data: AuthDTOs['ResendEmailCodeDTO'] = req.body
        const {email} = data
        try{
            const dataEmail = await AuthUserService.resendEmailCode({email})

            res.status(200).json({
                success: true,
                data: {email: dataEmail.email}
            })
        }catch(error){
            next(error)
        }
    }

    static async login(req: Request, res: Response<ApiResponse<null>>, next: NextFunction){
        const data: AuthDTOs['LoginRequestDTO'] = req.body

        try {
            const tokens = await AuthUserService.login(data)

            setAuthCookies(res, tokens)

            res.status(200).json({
                success: true,
                data: null
            })
        }catch(error){
            next(error)
        }
    }

    static async refreshToken(req: Request, res: Response<ApiResponse<null>>, next: NextFunction){
        try{
            const refreshToken = req.cookies.refreshToken
            if(!refreshToken) throw new UnauthorizedError('Refresh token não fornecido')

            const newTokens = await AuthUserService.refreshToken(refreshToken)

            setAuthCookies(res, newTokens)

            res.status(200).json({
                success: true,
                data: null
            })
        }catch(error){
            next(error)
        }
    }
}