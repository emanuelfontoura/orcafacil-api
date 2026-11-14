import 'dotenv/config'
import { z } from 'zod'

const MIN_JWT_SECRET_LENGTH = 32;
const GENERATE_SECRET_HINT = `gere com: node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"`;

const port = (fallback: number) => 
    z
    .string()
    .regex(/^\d{1,5}$/, { error: 'Use uma porta de 1 a 65535.' })
    .transform(Number)
    .refine((value) => value >= 1 && value <= 65535, {error: 'Use uma porta entre 1 e 65535'})
    .default(fallback)

const jwtSecret = z
  .string({ error: `Obrigatório; ${GENERATE_SECRET_HINT}` })
  .min(MIN_JWT_SECRET_LENGTH, {
    error: `Use ao menos ${MIN_JWT_SECRET_LENGTH} caracteres; ${GENERATE_SECRET_HINT}`,
});

const envSchema = z.object({
    PORT: port(3000),
    NODE_ENV: z.enum(['development', 'test', 'production'], {error: 'Obrigatório: development, test ou production.'}),
    DATABASE_URL: z
      .string({ error: 'Obrigatória, ex.: postgresql://orcafacil:orcafacil@localhost:5433/orcafacil.' })
      .regex(/^postgres(ql)?:\/\//, { error: 'Use uma URL postgresql://.' }), 
    REDIS_HOST: z.string().min(1),
    REDIS_PORT: port(6379),
    PEPPER: z.string().min(1),
    USER_EMAIL: z.email(),
    USER_PASSWORD: z.string().min(1),
    JWT_ACCESS_SECRET: jwtSecret,
    JWT_REFRESH_SECRET: jwtSecret
})

const source = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''))
const result = envSchema.safeParse(source)

if(!result.success){
    const problems = result.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`)
    throw new Error(`Variáveis de ambiente inválidas:\n${problems.join('\n')}`)
}

export const env = Object.freeze(result.data)