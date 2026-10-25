import { Router } from "express";
import { Container } from "./container";
import { createClientsRoute } from "./modules/clients/clients.route";

export function createRouter(container: Container): Router{
    const router = Router()

    router.use('/clients', createClientsRoute(container))

    return router
}