import { createApp } from "./app";
import { createContainer } from "./container";
import { env } from '@/config/env'

const port = env.PORT

const app = createApp(createContainer())

app.listen(port, (error) => {
    if (error) throw error

    console.log(`API rodando em http://localhost:${port}`)
})