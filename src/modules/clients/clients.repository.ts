import { prisma } from "@/lib/prisma"
import { AppError } from "@/shared/errors/AppError"
import { ErrorCode } from "@/shared/errors/ErrorCodes"
import { ClientsDTOs } from "./clients.dtos"

export class ClientsRepository{

    static async create(data: ClientsDTOs['CreateRequestDTO']): Promise<ClientsDTOs['CreateResponseDTO']>{
        try{
            const newClient = await prisma.client.create({
                data: {
                    name: data.name,
                    cnpjCpf: data.cnpjCpf,
                    email: data.email,
                    tellphone: data.tellphone,
                    sellerId: data.sellerId,
                    userId: data.userId                
                }
            })
            return newClient
        }catch{
            throw new AppError('Erro ao cadastrar o cliente', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    static async edit(id: number, data: ClientsDTOs['EditRequestDTO']): Promise<ClientsDTOs['EditResponseDTO']>{

    }

    static async searchClientByCnpjCpf(cnpjCpf: string, userId: number){
        try{
            const data = await prisma.client.findUnique({
                where: {
                    userId_cnpjCpf: {
                        cnpjCpf,
                        userId
                    }
                }
            })
            return data
        }catch{
            throw new AppError('Erro ao realizar busca de cliente pelo email', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    static async searchClientById(id: number){
        try{
            const data = await prisma.client.findUnique({where: {id}})
            return data
        }catch{
            throw new AppError('Erro ao realizar busca de cliente pelo ID', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

}