export interface RegisterUserDTO {
    name: string
    email: string
    password: string
    confirmPassword: string
}

export interface UserResponseDTO{
    id: number
    name: string
    email: string
}