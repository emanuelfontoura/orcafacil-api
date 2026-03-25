export interface CreateUserDTO{
    email: string
    name: string
    password: string
    confirmPassword: string
    created_at: string
    updated_at: string
}

export interface UserResponseDTO{
    email: string
    name: string
    created_at: string
    updated_at: string
}

export type User = {
    id: number
    email: string
    name: string
    createdAt: Date
    updatedAt: Date
}