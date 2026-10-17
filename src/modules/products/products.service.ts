import { ConflictError } from "@/shared/errors/ConflictError";
import { ProductsDTOs } from "./products.dtos";
import { ProductsRepository } from "./products.repository";
import { ErrorCode } from "@/shared/errors/ErrorCodes";

export class ProductsService{
    static async create(data: ProductsDTOs['ProductCreateDTO'], userId: number): Promise<ProductsDTOs['ProductDTO']>{
        const newProduct = await ProductsRepository.create(data, userId)
        return newProduct
    }

    static async edit(data: ProductsDTOs['ProductEditDTO'], id: number): Promise<ProductsDTOs['ProductDTO']>{
        const editedProduct = await ProductsRepository.edit(data, id)
        return editedProduct
    }

    static async delete(id: number): Promise<ProductsDTOs['ProductDTO']>{
        const product = await ProductsRepository.searchProductById(id)
        if(!product) throw new ConflictError('Produto não cadastrado', ErrorCode.INVALID_PRODUCT)
        const deletedProduct = await ProductsRepository.delete(id)
        return deletedProduct
    }
}