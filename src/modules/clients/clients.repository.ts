import { prisma } from "@/lib/prisma"
import { AppError } from "@/shared/errors/AppError"
import { ErrorCode } from "@/shared/errors/ErrorCodes"

export class ClientsRepository{

    static async create(){
        console.log('teste')
        // try{
        // }catch{
        //     throw new AppError('Erro ao criar cliente no banco de dados', 500, ErrorCode.INTERNAL_SERVER_ERROR)
        // }
    }

    static async searchClientByEmail(email: string){
        try{
            const data = await prisma.client.findUnique({where: {email}})
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