import { z } from "zod"
import { ClientsSchema } from "./clients.schema"

export type ClientsTypes = {
    CreateType: {
        name: string
        cnpjCpf: string
        tellphone?: string | null
        email?: string | null
        sellerId?: number | null
        userId: number
    },
    CreateResponseType: {
        id: number
        name: string
        cnpjCpf: string
        tellphone?: string | null
        email?: string | null
        selledId?: number | null
        userId: number
        createdAt: Date
        updatedAt: Date
    },

    EditType: z.infer<typeof ClientsSchema.edit>
    EditResponseType: ClientsTypes['CreateResponseType']
}