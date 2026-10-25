import { createApp } from "./app";
import { createContainer } from "./container";
import 'dotenv/config'

const port = process.env.PORT || 3000

const app = createApp(createContainer())

app.listen(port, (error) => {
    if (error) throw error

    console.log(`API rodando em http://localhost/${port}`)
})