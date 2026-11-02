import { Router } from "express";
import { Container } from "./container";
import { createClientsRoute } from "./modules/clients/clients.route";
import { createAuthUserRoutes } from "./modules/auth/auth.route";

export function createRouter(container: Container): Router{
    const router = Router()

    router.use('/clients', createClientsRoute(container))
    router.use('/user/auth', createAuthUserRoutes(container))

    return router
}