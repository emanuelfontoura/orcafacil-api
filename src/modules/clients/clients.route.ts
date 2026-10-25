import { Container } from '@/container'
import { validateSchema } from '@/middlewares/validate'
import { Router } from 'express'
import { ClientsSchema } from './clients.schema'

type ClientsRoutesDeps = Pick<Container, 'clientsController' | 'rateLimit'>

export function createClientsRoute({clientsController, rateLimit}: ClientsRoutesDeps): Router{
    const router = Router()

    // Criar usuário
    router.post(
        '/create',
        validateSchema(ClientsSchema.create),
        clientsController.create
    )

    // Atualizar dados usuário
    router.patch(
        '/edit/:id',
        validateSchema(ClientsSchema.edit),
        clientsController.edit
    )

    // Deletar usuário
    router.delete(
        '/delete/:id',
        clientsController.delete
    )

    // Obter dados de todos os usuários com filtro
    router.get(
        '/',
        validateSchema(ClientsSchema.getAllQuery),
        clientsController.getAll
    )
    
    // Obter dados de um usuário buscando por ID
    router.get(
        '/:id',
        clientsController.getById
    )

    return router
}