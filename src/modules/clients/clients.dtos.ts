export interface ClientsDTOs{
    CreateRequestDTO: {
        name: string,
        email: string,
        tellphone: string,
        sellerId: number
    }
    CreateResponseDTO: {
        id: number,
        name: string,
        email: string,
        tellphone: string,
        sellerId: number
        createdAt: Date,
        updatedAt: Date
    }
}