import 'dotenv/config'

import { redis } from "./lib/redis"
import { prisma } from "@/lib/prisma"
import { createAuthenticate } from "./middlewares/authenticate"
import { createRateLimit } from "./middlewares/rateLimit"
import { TokenService } from "./shared/utils/TokenService"
import { ArgonHash } from './shared/utils/ArgonHash'

import { ClientsController } from "./modules/clients/clients.controller"
import { ClientsRepository } from "./modules/clients/clients.repository"
import { ClientsService } from "./modules/clients/clients.service"
import { AuthUserRepository } from "./modules/auth/auth.repository"
import { AuthUserService } from "./modules/auth/auth.service"
import { AuthUserController } from "./modules/auth/auth.controller"
import { ProductsRepository } from './modules/products/products.repository'
import { ProductsService } from './modules/products/products.service'
import { ProductsController } from './modules/products/products.controller'
import { UserRepository } from './modules/user/user.repository'

const tokenService = new TokenService({
    acessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!
})

export function createContainer(){
    const argonHash = new ArgonHash()

    const clientsRepository = new ClientsRepository(prisma)
    const clientsService = new ClientsService(clientsRepository)

    const authUserRepository = new AuthUserRepository()
    const userRepository = new UserRepository(prisma)
    const authUserService = new AuthUserService(authUserRepository, userRepository, argonHash, redis)

    const productRepository = new ProductsRepository(prisma)
    const productService = new ProductsService(productRepository)

    return {
        authenticate: createAuthenticate(tokenService),
        rateLimit: createRateLimit(redis),
        clientsController: new ClientsController(clientsService),
        authUserController: new AuthUserController(authUserService),
        productsController: new ProductsController(productService)
    }
}

export type Container = ReturnType<typeof createContainer>