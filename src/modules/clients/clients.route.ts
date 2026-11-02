import { Container } from '@/container'
import { validateSchema } from '@/middlewares/validate'
import { Router } from 'express'
import { ClientsSchema } from './clients.schema'

type ClientsRoutesDeps = Pick<Container, 'clientsController' | 'rateLimit' | 'authenticate'>

export function createClientsRoute({clientsController, rateLimit, authenticate}: ClientsRoutesDeps): Router{
    const router = Router()

    // Criar usuário
    router.post(
        '/create',
        authenticate,
        validateSchema(ClientsSchema.create),
        clientsController.create
    )

    // Atualizar dados usuário
    router.patch(
        '/edit/:id',
        authenticate,
        validateSchema(ClientsSchema.edit),
        clientsController.edit
    )

    // Deletar usuário
    router.delete(
        '/delete/:id',
        authenticate,
        clientsController.delete
    )

    // Obter dados de todos os usuários com filtro
    router.get(
        '/',
        authenticate,
        validateSchema(ClientsSchema.getAllQuery),
        clientsController.getAll
    )
    
    // Obter dados de um usuário buscando por ID
    router.get(
        '/:id',
        authenticate,
        clientsController.getById
    )

    return router
}