export interface AuthUserVerifyDTO{
    name: string
    email: string
    password: string
    confirmPassword: string
}

export interface AuthUserConfirmDTO{
    email: string
    code: number
}