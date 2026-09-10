import { ApiResponse } from '@/shared/types/apiResponse';
import { Request, Response, NextFunction } from 'express'
import { ProductsDTOs } from './products.dtos';
import { ProductsService } from './products.service';
import { ProductsSchema } from './products.schema';

export class ProductsController {
    static async create(req: Request, res: Response<ApiResponse<ProductsDTOs['ProductDTO']>>, next: NextFunction){
        try{
            const data: ProductsDTOs['ProductCreateDTO'] = req.body
            const userId = req.user
            const product = await ProductsService.create(data, Number(userId))
            return res.status(200).json({
                success: true,
                data: product
            })
        }catch(error){
            next(error)
        }
    }

    static async edit(req: Request, res: Response<ApiResponse<ProductsDTOs['ProductDTO']>>, next: NextFunction){
        try{
            const data: ProductsDTOs['ProductEditDTO'] = req.body
            const { id } = ProductsSchema.isValidIDNumber.parse(req.params)
            const editedProduct = await ProductsService.edit(data, Number(id))
            return res.status(200).json({
                success: true,
                data: editedProduct
            })
        }catch(error){
            next(error)
        }
    }

    static async delete(req: Request, res: Response<ApiResponse<ProductsDTOs['ProductDTO']>>, next: NextFunction){
        try{
            const { id } = ProductsSchema.isValidIDNumber.parse(req.params)
            const deletedProduct = await ProductsService.delete(Number(id))
            return res.status(200).json({
                success: true,
                data: deletedProduct
            })
        }catch(error){
            next(error)
        }
    }

    static async getAll(req: Request, res: Response<ApiResponse<null>>, next: NextFunction){
        try{

        }catch(error){
            next(error)
        }
    }

    static async getById(req: Request, res: Response<ApiResponse<null>>, next: NextFunction){
        try{

        }catch(error){
            next(error)
        }
    }
}