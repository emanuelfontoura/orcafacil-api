import { ConflictError } from "@/shared/errors/ConflictError";
import { ProductsDTOs } from "./products.dtos";
import { ProductsRepository } from "./products.repository";
import { ErrorCode } from "@/shared/errors/ErrorCodes";

export class ProductsService{
    constructor(private readonly productsRepository: ProductsRepository){}

    async create(data: ProductsDTOs['ProductCreateDTO'], userId: number): Promise<ProductsDTOs['ProductDTO']>{
        const newProduct = await this.productsRepository.create(data, userId)
        return newProduct
    }

    async edit(data: ProductsDTOs['ProductEditDTO'], id: number): Promise<ProductsDTOs['ProductDTO']>{
        const editedProduct = await this.productsRepository.edit(data, id)
        return editedProduct
    }

    async delete(id: number): Promise<ProductsDTOs['ProductDTO']>{
        const product = await this.productsRepository.searchProductById(id)
        if(!product) throw new ConflictError('Produto não cadastrado', ErrorCode.INVALID_PRODUCT)
        const deletedProduct = await this.productsRepository.delete(id)
        return deletedProduct
    }
}