import { z } from "zod"
import { ProductsSchema } from "./products.schema"

export interface ProductsDTOs{
    ProductDTO: {
        id: number,
        name: string,
        description: string | null,
        price: number,
        createdAt: Date,
        updatedAt: Date,
        userId: number
    },
    ProductCreateDTO: z.infer<typeof ProductsSchema.create>,
    ProductEditDTO: z.infer<typeof ProductsSchema.edit>
}