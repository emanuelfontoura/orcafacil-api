import { z } from 'zod'

export const ProductsSchema = {
    create: z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(255).optional(),
        price: z.number().positive()
    }),
    edit: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(255).optional(),
        price: z.number().positive().optional()
    }),

    isValidIDNumber: z.object({
        id: z.coerce.number().int().positive()
    })
}