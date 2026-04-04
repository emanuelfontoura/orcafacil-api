import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { handleError } from '@/middlewares/handleError';

// Import routes
import { userRouter } from '@/modules/user/user.route'
import { authUserRoutes } from '@/modules/auth/auth.route'

const PORT = process.env.PORT || 3000;

const app = express();

// Essentials middlewares
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Apply Routes
app.use('/user/auth', authUserRoutes)
app.use('/user', userRouter)

// HandleError
app.use(handleError)

// Start server connection
app.listen(PORT, () => {
    console.log('Server is running...')
})