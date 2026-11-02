import { Router } from 'express'
import { validateSchema } from '@/middlewares/validate'
import { ProductsSchema } from './products.schema'
import { Container } from '@/container'

type ProductsRoutesDeps = Pick<Container, 'productsController' | 'authenticate' | 'rateLimit'>

export function createProductsRoutes({productsController, authenticate, rateLimit}: ProductsRoutesDeps): Router{
    const router = Router()

    router.post(
        '/create',
        authenticate,
        rateLimit({maxReqLimit: 100, maxTimeLimit: 60, route: 'products/create'}),
        validateSchema(ProductsSchema.create),
        productsController.create
    )

    router.post(
        '/edit/:id',
        authenticate,
        rateLimit({maxReqLimit: 100, maxTimeLimit: 60, route: 'products/edit'}),
        validateSchema(ProductsSchema.edit),
        productsController.edit
    )

    return router
}