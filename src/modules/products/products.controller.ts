import { ApiResponse } from '@/shared/types/apiResponse';
import { Request, Response, NextFunction } from 'express'
import { ProductsDTOs } from './products.dtos';
import { ProductsService } from './products.service';
import { ProductsSchema } from './products.schema';

export class ProductsController {
    constructor(private readonly productsService: ProductsService){}

    async create(req: Request, res: Response<ApiResponse<ProductsDTOs['ProductDTO']>>, next: NextFunction){
        try{
            const data: ProductsDTOs['ProductCreateDTO'] = req.body
            const userId = req.user
            const product = await this.productsService.create(data, Number(userId))
            return res.status(200).json({
                success: true,
                data: product
            })
        }catch(error){
            next(error)
        }
    }

    async edit(req: Request, res: Response<ApiResponse<ProductsDTOs['ProductDTO']>>, next: NextFunction){
        try{
            const data: ProductsDTOs['ProductEditDTO'] = req.body
            const { id } = ProductsSchema.isValidIDNumber.parse(req.params)
            const editedProduct = await this.productsService.edit(data, Number(id))
            return res.status(200).json({
                success: true,
                data: editedProduct
            })
        }catch(error){
            next(error)
        }
    }

    async delete(req: Request, res: Response<ApiResponse<ProductsDTOs['ProductDTO']>>, next: NextFunction){
        try{
            const { id } = ProductsSchema.isValidIDNumber.parse(req.params)
            const deletedProduct = await this.productsService.delete(Number(id))
            return res.status(200).json({
                success: true,
                data: deletedProduct
            })
        }catch(error){
            next(error)
        }
    }

    async getAll(req: Request, res: Response<ApiResponse<null>>, next: NextFunction){
        try{

        }catch(error){
            next(error)
        }
    }

    async getById(req: Request, res: Response<ApiResponse<null>>, next: NextFunction){
        try{

        }catch(error){
            next(error)
        }
    }
}