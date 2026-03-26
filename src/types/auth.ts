export interface AuthUserVerifyDTO{
    name: string
    email: string
    password: string
    confirmPassword: string
}

export interface AuthUserConfirmDTO{
    email: string
    code: string
}

export type EmailCode = {
    email: string
    code: string
}

export type UserInfo = {
    email: string
    name: string
}