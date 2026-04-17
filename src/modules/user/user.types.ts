export type UserTypes = {
    UserComplete: {
        email: string
        name: string
        password: string
    }

    UserResponse: {
        id: number
        email: string
        name: string
        createdAt: Date
        updatedAt: Date
    }

    UserCredentials: {
        id: number,
        email: string,
        password: string
    }
}