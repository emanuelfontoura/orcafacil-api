import { CookieOptions, Response } from "express";
import { AuthDTOs } from "@/modules/auth/auth.dtos";

export class AuthCookies{

    private static configATCookies: CookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    }

    private static configRTCookies: CookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/"
    }

    static setAuthCookies(res: Response, tokens: AuthDTOs['TokensDTO']){
        res.cookie('accessToken', tokens.accessToken, {
            ...this.configATCookies,
            maxAge: 15 * 60 * 1000 // 15 min
        })
        res.cookie('refreshToken', tokens.refreshToken, {
            ...this.configRTCookies,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
        })
    }

    static clearAuthCookies(res: Response){
        res.clearCookie('accessToken', this.configATCookies)
        res.clearCookie('refreshToken', this.configRTCookies)
    }

}