import { NextFunction, Request, Response } from "express";
import { AuthUserService } from "@/modules/auth/auth.service";
import { AuthDTOs } from "@/modules/auth/auth.dtos";
import { ApiResponse } from "@/shared/types/apiResponse";
import { UnauthorizedError } from "@/shared/errors/UnauthorizedError";
import { AuthCookies } from "@/shared/utils/AuthCookies";

export class AuthUserController {

    constructor(private readonly AuthUserService: AuthUserService){}

    async verifyEmail(req: Request, res: Response<ApiResponse<AuthDTOs['VerifyEmailResponseDTO']>>, next: NextFunction){
        const data: AuthDTOs['VerifyEmailRequestDTO'] = req.body
        const {cnpjCpf, email, name, password, confirmPassword} = data

        try{
            const dataUser = await this.AuthUserService.verifyEmail(
                {cnpjCpf, email, name, password, confirmPassword}
            )
            return res.status(200).json({
                success: true,
                data: dataUser
            })
        }catch(error){
            next(error)
        }

    }

    async confirmEmail(req: Request, res: Response<ApiResponse<AuthDTOs['ConfirmEmailResponseDTO']>>, next: NextFunction){
        const data: AuthDTOs['ConfirmEmailRequestDTO'] = req.body
        const {email, code} = data
        try{
            const user: AuthDTOs['ConfirmEmailResponseDTO'] = await this.AuthUserService.confirmEmail({email, code})
            res.status(200).json({
                success: true,
                data: {
                    id: user.id,
                    cnpjCpf: user.cnpjCpf,
                    email: user.email,
                    name: user.name,
                    createdAt: user.createdAt
                }
            })
        }catch(error){
            next(error)
        }
    }

    async resendEmailCode(req: Request, res: Response<ApiResponse<{email: string}>>, next: NextFunction){
        const data: {email: string} = req.body
        const {email} = data
        try{
            const dataEmail = await this.AuthUserService.resendEmailCode({email})

            res.status(200).json({
                success: true,
                data: {email: dataEmail.email}
            })
        }catch(error){
            next(error)
        }
    }

    async login(req: Request, res: Response<ApiResponse<null>>, next: NextFunction){
        const data: AuthDTOs['LoginRequestDTO'] = req.body

        try {
            const tokens = await this.AuthUserService.login(data)

            AuthCookies.setAuthCookies(res, tokens)

            return res.status(200).json({
                success: true,
                data: null
            })
        }catch(error){
            next(error)
        }
    }

    async refreshToken(req: Request, res: Response<ApiResponse<null>>, next: NextFunction){
        try{
            const refreshToken = req.cookies.refreshToken
            if(!refreshToken) throw new UnauthorizedError('Refresh token não fornecido')

            const newTokens = await this.AuthUserService.refreshToken(refreshToken)

            AuthCookies.setAuthCookies(res, newTokens)

            res.status(200).json({
                success: true,
                data: null
            })
        }catch(error){
            next(error)
        }
    }

    async sendCodeRecovery(req: Request, res: Response<ApiResponse<{tokenUUID: string | null}>>, next: NextFunction){
        const data: {email: string} = req.body
        const {email} = data

        try{
            const tokenUUID = await this.AuthUserService.sendCodeRecovery(email)
            res.status(200).json({
                success: true,
                data: tokenUUID
            })
        }catch(error){
            next(error)
        }
    } 

    async confirmCodeRecovery(req: Request, res: Response<ApiResponse<{tokenUUID: string | null}>>, next: NextFunction){
        const data: AuthDTOs['ConfirmCodeRecoveryRequestDTO'] = req.body
        const {tokenUUID, code} = data

        try{
            const newTokenUUID = await this.AuthUserService.confirmCodeRecovery({tokenUUID, code})
            res.status(200).json({
                success: true,
                data: newTokenUUID
            })
        }catch(error){
            next(error)
        }
    }

    async createNewPassword(req: Request, res: Response<ApiResponse<null>>, next: NextFunction){
        const data: AuthDTOs['CreateNewPasswordRequestDTO'] = req.body
        
        try{
            await this.AuthUserService.createNewPassword(data)
            res.status(200).json({
                success: true,
                data: null
            })
        }catch(error){
            next(error)
        }
    }

    async logout(req: Request, res: Response<ApiResponse<null>>, next: NextFunction){
        try{
            await this.AuthUserService.logout(req.cookies.refreshToken)
            AuthCookies.clearAuthCookies(res)
            res.status(200).json({
                success: true,
                data: null
            })
        }catch(error){
            next(error)
        }
    }
}