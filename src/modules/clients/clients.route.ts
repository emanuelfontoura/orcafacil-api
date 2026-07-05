import { Router } from 'express'
import { rateLimit } from '@/middlewares/rateLimit'
import { validateSchema } from '@/middlewares/validate'
import { ClientsController } from './clients.controller'
import { ClientsSchema } from './clients.schema'
import { authenticate } from '@/middlewares/authenticate'

const ClientsRoutes = Router()

ClientsRoutes.post('/create', rateLimit(100, 60, 'clients/create'), authenticate, validateSchema(ClientsSchema.create), ClientsController.create)

export { ClientsRoutes }