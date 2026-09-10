import { Router } from 'express'
import { rateLimit } from '@/middlewares/rateLimit'
import { validateSchema } from '@/middlewares/validate'
import { authenticate } from '@/middlewares/authenticate'
import { ProductsSchema } from './products.schema'
import { ProductsController } from './products.controller'

const ProductsRoutes = Router()

ProductsRoutes.post('/create', rateLimit(100, 60, 'products/create'), validateSchema(ProductsSchema.create), authenticate, ProductsController.create)
ProductsRoutes.patch('/edit/:id', rateLimit(100, 60, 'products/edit'), validateSchema(ProductsSchema.edit), authenticate, ProductsController.edit)

export { ProductsRoutes }