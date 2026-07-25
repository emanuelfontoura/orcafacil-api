export interface ClientsDTOs{
    CreateRequestDTO: {
        name: string,
        cnpjCpf: string,
        email: string,
        tellphone: string,
        sellerId: number | null,
        userId: number
    },
    CreateResponseDTO: {
        name: string,
        cnpjCpf: string,
        email: string,
        tellphone: string,
        sellerId: number | null,
        createdAt: Date,
        updatedAt: Date,
        userId: number
    }
}