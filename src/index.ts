import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { sequelize } from './db/conn';
// Import models
import { users } from 'models/users';

// Import routes
import { userRouter } from './routes/userRoutes'

const PORT = process.env.PORT || 3000;

const app = express();

// Essentials middlewares
app.use(cors());
app.use(express.json());

// Apply Routes
app.use('/user', userRouter)

// Start on database and server connection
sequelize.sync()
.then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`)
    })
})
.catch((error: Error) => {
    console.log(error)
})