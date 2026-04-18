import { Response } from "express";
import { AuthDTOs } from "@/modules/auth/auth.dtos";

export function setAuthCookies(res: Response, tokens: AuthDTOs['TokensDTO']){
    res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000 // 15 min
    })
    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/user/auth/refresh-token",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    })
}