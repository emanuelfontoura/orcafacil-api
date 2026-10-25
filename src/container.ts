import { createRateLimit } from "./middlewares/rateLimit"
import { ClientsController } from "./modules/clients/clients.controller"
import { ClientsRepository } from "./modules/clients/clients.repository"
import { ClientsService } from "./modules/clients/clients.service"
import { redis } from "./lib/redis"
import { prisma } from "@/lib/prisma"

export function createContainer(){
    const clientsRepository = new ClientsRepository(prisma)
    const clientsService = new ClientsService(clientsRepository)

    return {
        rateLimit: createRateLimit(redis),
        clientsController: new ClientsController(clientsService)
    }
}

export type Container = ReturnType<typeof createContainer>