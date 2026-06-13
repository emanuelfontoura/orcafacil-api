export interface ClientsDTOs{
    CreateRequestDTO: {
        name: string,
        email: string,
        tellphone: string,
        sellerId: Number
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