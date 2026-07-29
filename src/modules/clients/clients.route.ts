import { Router } from 'express'
import { rateLimit } from '@/middlewares/rateLimit'
import { validateSchema } from '@/middlewares/validate'
import { ClientsController } from './clients.controller'
import { ClientsSchema } from './clients.schema'
import { authenticate } from '@/middlewares/authenticate'

const ClientsRoutes = Router()

ClientsRoutes.post('/create', rateLimit(100, 60, 'clients/create'), authenticate, validateSchema(ClientsSchema.create), ClientsController.create)
ClientsRoutes.patch('/edit/:id', rateLimit(100, 60, 'clients/edit'), authenticate, validateSchema(ClientsSchema.edit), ClientsController.edit)
ClientsRoutes.delete('/delete/:id', rateLimit(100, 60, 'clients/delete'), authenticate, ClientsController.delete)
ClientsRoutes.get('/', rateLimit(100, 60, 'clients/getAll'), authenticate, ClientsController.getAll)
ClientsRoutes.get('/:id', rateLimit(100, 60, 'clients/getById'), authenticate, ClientsController.getById)

export { ClientsRoutes }