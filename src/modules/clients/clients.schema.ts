import { z } from 'zod'
import { isValidCnpjCpf } from '@/shared/utils/IsValidCnpjCpf'

export const ClientsSchema = {
    create: z.object({
        name: z.string().min(1).max(255),
        cnpjCpf: z.string().refine(
            isValidCnpjCpf, {
                message: 'CPF ou CNPJ inválido'
            }
        ),
        tellphone: z.string(),
        email: z.email().max(255),
        sellerId: z.number(),
        userId: z.number().min(1)
    }),

    edit: z.object({
        name: z.string().min(1).max(255).optional(),
        cnpjCpf: z.string().refine(
            isValidCnpjCpf, {
                message: 'CPF ou CNPJ inválido'
            }
        ).optional(),
        tellphone: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        sellerId: z.number().nullable().optional(),
        userId: z.number().min(1)
    }).refine((data) => Object.keys(data).length > 0, {message: 'Informe pelo menos um capo para atualizar'})
}