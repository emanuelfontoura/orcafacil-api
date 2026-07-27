import { z } from "zod"
import { ClientsSchema } from "./clients.schema"

export interface ClientsDTOs{
    CreateRequestDTO: z.infer<typeof ClientsSchema.create>,
    CreateResponseDTO: {
        name: string,
        cnpjCpf: string,
        email?: string | null,
        tellphone?: string | null,
        sellerId?: number | null,
        createdAt: Date,
        updatedAt: Date,
        userId: number
    },

    EditRequestDTO: z.infer<typeof ClientsSchema.edit>,
    EditResponseDTO: ClientsDTOs['CreateResponseDTO']
}