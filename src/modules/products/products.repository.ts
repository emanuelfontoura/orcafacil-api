import { prisma } from "@/lib/prisma";
import { ProductsDTOs } from "./products.dtos";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCode } from "@/shared/errors/ErrorCodes";
import { Product } from "@prisma/client";

export class ProductsRepository{
    // CRUD
    static async create(data: ProductsDTOs['ProductCreateDTO'], userId: number): Promise<ProductsDTOs['ProductDTO']>{
        try{
            const newProduct = await prisma.product.create({
                data: {
                    name: data.name,
                    description: data.description,
                    price: data.price,
                    userId: userId
                }
            })
            return this.convertPriceToNumber(newProduct)
        }catch{
            throw new AppError('Erro ao cadastrar produto', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    static async edit(data: ProductsDTOs['ProductEditDTO'], id: number): Promise<ProductsDTOs['ProductDTO']>{
        try{
            const editedProduct = await prisma.product.update({
                data,
                where: {id}
            })
            return this.convertPriceToNumber(editedProduct)
        }catch{
            throw new AppError('Erro ao editar produto', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    static async delete(id: number): Promise<ProductsDTOs['ProductDTO']>{
        try{
            const deletedProduct = await prisma.product.delete({where: {id}})
            return this.convertPriceToNumber(deletedProduct)
        }catch{
            throw new AppError('Erro ao deletar produto', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    // Buscas
    static async searchProductById(id: number): Promise<ProductsDTOs['ProductDTO'] | null>{
        try{
            const product = await prisma.product.findUnique({where: {id}})
            if(product) return this.convertPriceToNumber(product)
            return null
        }catch{
            throw new AppError('Erro ao buscar produto', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    // Helpers da classe
    private static convertPriceToNumber(data: Product): ProductsDTOs['ProductDTO']{
        return {...data, price: Number(data.price)}
    }
}