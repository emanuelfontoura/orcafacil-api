export interface VerifyEmailRequestDTO{
    name: string
    email: string
    password: string
    confirmPassword: string
}

export interface VerifyEmailResponseDTO{
    email: string
    name: string
}