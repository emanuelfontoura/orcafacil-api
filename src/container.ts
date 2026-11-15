import { env } from '@/config/env'

import { redis } from "./lib/redis"
import { prisma } from "@/lib/prisma"
import { createAuthenticate } from "./middlewares/authenticate"
import { createRateLimit } from "./middlewares/rateLimit"
import { TokenService } from "./shared/utils/TokenService"
import { ArgonHash } from './shared/utils/ArgonHash'

import { ClientsController } from "./modules/clients/clients.controller"
import { ClientsRepository } from "./modules/clients/clients.repository"
import { ClientsService } from "./modules/clients/clients.service"
import { AuthUserService } from "./modules/auth/auth.service"
import { AuthUserController } from "./modules/auth/auth.controller"
import { ProductsRepository } from './modules/products/products.repository'
import { ProductsService } from './modules/products/products.service'
import { ProductsController } from './modules/products/products.controller'
import { UserRepository } from './modules/user/user.repository'
import { SmtpEmailSender } from './shared/email/SmtpEmailSender'

const tokenService = new TokenService({
    acessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET
})

export function createContainer(){
    const argonHash = new ArgonHash()
    const emailSender = new SmtpEmailSender({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.EMAIL_FROM
    })

    const clientsRepository = new ClientsRepository(prisma)
    const clientsService = new ClientsService(clientsRepository)

    const userRepository = new UserRepository(prisma)
    const authUserService = new AuthUserService(userRepository, argonHash, redis, tokenService, emailSender)

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