export type UserComplete = {
    email: string
    name: string
    password: string
}

export type UserResponse = {
    id: number
    email: string
    name: string
    createdAt: Date
    updatedAt: Date
}