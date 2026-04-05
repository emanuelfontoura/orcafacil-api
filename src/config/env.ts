import "dotenv/config"

export const env = {
    // JWT
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,

    // Hash PEPPER
    PEPPER: process.env.PEPPER!,

    // DB Credentials
    USER_PASSWORD: process.env.USER_PASSWORD!,
    USER_EMAIL: process.env.USER_EMAIL!,
    DATABASE_URL: process.env.DATABASE_URL!
}