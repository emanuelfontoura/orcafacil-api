import { Container } from "./container";
import express from 'express'
import { createRouter } from "./routes";

export function createApp(container: Container){
    const app = express()

    app.use('/api/v1', createRouter(container))

    return app
}