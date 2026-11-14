import { Container } from "./container";
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createRouter } from "./routes";
import { handleError } from '@/middlewares/handleError'

export function createApp(container: Container){
    const app = express()

    // Middlewares globais
    app.use(cors({
        origin: 'http://localhost:3000',
        credentials: true
    }))
    app.use(express.json())
    app.use(cookieParser())

    app.use('/api/v1', createRouter(container))

    // Sempre o último: recebe tudo o que foi passado a next(error)
    app.use(handleError)

    return app
}
