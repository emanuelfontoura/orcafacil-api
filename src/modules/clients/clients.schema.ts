import { z } from 'zod'

export const ClientsSchema = {
    create: z.object({
        name: z.string().min(1).max(255),
        tellphone: z.string(),
        email: z.email().max(255),
        sellerId: z.number()
    })
}