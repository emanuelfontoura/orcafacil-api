export interface ClientsDTOs{
    CreateRequestDTO: {
        name: String,
        email: String,
        tellphone: String,
        sellerId: Number
    }
    CreateResponseDTO: {
        id: number,
        name: String,
        email: String,
        tellphone: String,
        sellerId: Number
        createdAt: Date,
        updatedAt: Date
    }
}