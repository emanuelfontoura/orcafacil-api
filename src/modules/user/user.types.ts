export type UserTypes = {
    UserComplete: {
        cnpjCpf: string
        email: string
        name: string
        password: string
    }

    UserResponse: {
        id: number
        cnpjCpf: string
        email: string
        name: string
        createdAt: Date
        updatedAt: Date
    }

    UserCredentials: {
        id: number,
        cnpjCpf: string
        email: string,
        password: string
    }
}