import { Router } from "express";
import { Container } from "./container";
import { createClientsRoute } from "./modules/clients/clients.route";
import { createAuthUserRoutes } from "./modules/auth/auth.route";
import { createProductsRoutes } from "./modules/products/products.route";
import { UserRoutes } from "./modules/user/user.route";

export function createRouter(container: Container): Router{
    const router = Router()

    router.use('/clients', createClientsRoute(container))
    router.use('/user/auth', createAuthUserRoutes(container))
    router.use('/user', UserRoutes)
    router.use('/products', createProductsRoutes(container))

    return router
}
