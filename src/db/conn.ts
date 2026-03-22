import { Sequelize } from 'sequelize';
import 'dotenv/config';

const DB_USER = process.env.DB_USER
const DB_PASSWORD = process.env.DB_PASSWORD
const DB_HOST = process.env.DB_HOST
const DB_NAME = process.env.DB_NAME

export const sequelize = new Sequelize(
    DB_NAME!,
    DB_USER!,
    DB_PASSWORD!,
    {
        host: DB_HOST!,
        dialect: 'mysql'
    }
)

try{
    sequelize.authenticate()
}catch(error){
    console.log('Unable to connect to the database:', error)
}