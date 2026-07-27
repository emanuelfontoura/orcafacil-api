import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from "cookie-parser"
import { handleError } from '@/middlewares/handleError';

// Import routes
import { UserRoutes } from '@/modules/user/user.route'
import { AuthUserRoutes } from '@/modules/auth/auth.route'
import { ClientsRoutes } from './modules/clients/clients.route';

const PORT = process.env.PORT || 3000;

// teste

const app = express();

// Essentials middlewares
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())

// Apply Routes
app.use('/user/auth', AuthUserRoutes)
app.use('/user', UserRoutes)
app.use('/clients', ClientsRoutes)

// HandleError
app.use(handleError)

// Start server connection
app.listen(PORT, () => {
    console.log('Server is running...')
})