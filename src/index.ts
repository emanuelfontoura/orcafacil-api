import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Import routes
import { userRouter } from './routes/user/userRoutes'
import { userAuthRouter } from 'routes/auth/authUserRoutes'

const PORT = process.env.PORT || 3000;

const app = express();

// Essentials middlewares
app.use(cors());
app.use(express.json());

// Apply Routes
app.use('/user/auth', userAuthRouter)
app.use('/user', userRouter)

// Start on database and server connection