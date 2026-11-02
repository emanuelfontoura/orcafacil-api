import { createRateLimit } from "./middlewares/rateLimit"
import { ClientsController } from "./modules/clients/clients.controller"
import { ClientsRepository } from "./modules/clients/clients.repository"
import { ClientsService } from "./modules/clients/clients.service"
import { redis } from "./lib/redis"
import { prisma } from "@/lib/prisma"
import 'dotenv/config'
import { TokenService } from "./shared/utils/TokenService"
import { createAuthenticate } from "./middlewares/authenticate"

const tokenService = new TokenService({
    acessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!
})

export function createContainer(){
    const clientsRepository = new ClientsRepository(prisma)
    const clientsService = new ClientsService(clientsRepository)

    return {
        authenticate: createAuthenticate(tokenService),
        rateLimit: createRateLimit(redis),
        clientsController: new ClientsController(clientsService)
    }
}

export type Container = ReturnType<typeof createContainer>