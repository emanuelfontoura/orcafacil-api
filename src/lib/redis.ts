import Redis from "ioredis"
import "dotenv/config"

export const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
})