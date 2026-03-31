import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from "swagger-ui-express"
import swaggerDoc from "./docs/swagger"
import { handleError } from './middlewares/handleError';

// Import routes
import { userRouter } from './modules/user/user.route'
import { authUserRoutes } from './modules/auth/auth.route'

const PORT = process.env.PORT || 3000;

const app = express();

// Essentials middlewares
app.use(cors());
app.use(express.json());

// Swagger Documentation
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerDoc))

// Apply Routes
app.use('/user/auth', authUserRoutes)
app.use('/user', userRouter)

// HandleError
app.use(handleError)

// Start server connection
app.listen(PORT, () => {
    console.log('Server is running...')
})