export interface ConfirmEmailRequestDTO{
    email: string
    code: string
}

export interface ConfirmEmailResponseDTO{
    id: number
    email: string
    name: string
    createdAt: Date
}