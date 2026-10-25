import { AppError } from "@/shared/errors/AppError"
import { ErrorCode } from "@/shared/errors/ErrorCodes"
import { ClientsTypes } from "./clients.types"
import { PrismaClient } from "@prisma/client"

export class ClientsRepository{
    constructor(
        private readonly prisma: PrismaClient
    ){}

    async create(data: ClientsTypes['CreateType']): Promise<ClientsTypes['CreateResponseType']>{
        try{
            const newClient = await this.prisma.client.create({
                data: {
                    name: data.name,
                    cnpjCpf: data.cnpjCpf,
                    email: data.email,
                    tellphone: data.tellphone,
                    userId: data.userId                
                }
            })
            return newClient
        }catch{
            throw new AppError('Erro ao cadastrar o cliente', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    async edit(id: number, userId: number, data: ClientsTypes['EditType']): Promise<ClientsTypes['EditResponseType']>{
        try{
            const editedClient = await this.prisma.client.update({
                data,
                where: {id, userId}
            })
            return editedClient
        }catch{
            throw new AppError('Erro interno do servidor.', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    async delete(id: number, userId: number): Promise<ClientsTypes['DeleteType']>{
        try{
            const deletedClient = await this.prisma.client.delete({where: {id, userId}})
            return deletedClient
        }catch{
            throw new AppError('Erro ao deletar usuário.', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    async searchClientByCnpjCpf(cnpjCpf: string, userId: number){
        try{
            const data = await this.prisma.client.findUnique({
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

    async searchClientById(id: number, userId: number){
        try{
            const data = await this.prisma.client.findFirst({where: {id, userId}})
            return data
        }catch{
            throw new AppError('Erro ao realizar busca de cliente pelo ID', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

    async getAll(userId: number, filters?: ClientsTypes['GetAllType']): Promise<ClientsTypes['GetAllResponseType'][]>{
        try{
            const filteredClients = await this.prisma.client.findMany({where: {userId, ...filters}})
            return filteredClients
        }catch{
            throw new AppError('Erro ao filtrar usuários.', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        }
    }

}