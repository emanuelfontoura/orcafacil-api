import { prisma } from "@/lib/prisma"
import { AppError } from "@/shared/errors/AppError"
import { ErrorCode } from "@/shared/errors/ErrorCodes"
import { ClientsTypes } from "./clients.types"

export class ClientsRepository{

    static async create(data: ClientsTypes['CreateType']): Promise<ClientsTypes['CreateResponseType']>{
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

    static async edit(id: number, data: ClientsTypes['EditType']): Promise<ClientsTypes['EditResponseType']>{
        try{
            const editedClient = await prisma.client.update({
                data,
                where: {id}
            })
            return editedClient
        }catch{
            throw new AppError('Erro interno do servidor.', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    static async delete(id: number): Promise<ClientsTypes['DeleteType']>{
        try{
            const deletedClient = await prisma.client.delete({where: {id}})
            return deletedClient
        }catch{
            throw new AppError('Erro ao deletar usuário.', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
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

    static async getAll(userId: number, filters?: ClientsTypes['GetAllType']): Promise<ClientsTypes['GetAllResponseType'][]>{
        try{
            const filteredClients = await prisma.client.findMany({where: {userId, ...filters}})
            return filteredClients
        }catch{
            throw new AppError('Erro ao filtrar usuários.', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

}