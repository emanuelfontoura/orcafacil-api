import { UserTypes } from "@/modules/user/user.types"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/shared/errors/AppError"
import { ErrorCode } from "@/shared/errors/ErrorCodes"

export class userRepository {

    static async findByEmail(email: string): Promise<UserTypes['UserResponse']>{
        let data
        try{
            data =  await prisma.user.findUnique({
                where: {email},
                select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true
                }
            })
        }catch{
            throw new AppError('Erro ao buscar dados do usuário.', 500, ErrorCode.QUERY_DATABASE_ERROR)
        }
        if(!data) return null
        return {
            id: data.id,
            email: data.email,
            name: data.name,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        } 
    }

    static async createUser(data: UserTypes['UserComplete']): Promise<UserTypes['UserResponse']>{
        let dataUser
        try{
            dataUser = await prisma.user.create({
                data: {
                    email: data.email,
                    name: data.name,
                    password: data.password
                }
            })
        }catch{
            throw new AppError('Erro ao criar usuário.', 500, ErrorCode.USER_CREATION_FAILED)
        }   
        return {
            id: dataUser.id,
            email: dataUser.email,
            name: dataUser.name,
            createdAt: dataUser.createdAt,
            updatedAt: dataUser.updatedAt
        }
    }

    static async returnLoginCredentials(email: string): Promise<UserTypes['UserCredentials']>{
        let userCredentials
        try{
            userCredentials = await prisma.user.findUnique({
                where: {email},
                select: {
                    id: true,
                    email: true,
                    password: true
                }
            })
        }catch{
            throw new AppError('Erro ao buscar dados do usuário.', 500, ErrorCode.QUERY_DATABASE_ERROR)
        }
        if(!userCredentials) return null
        return {
            id: userCredentials.id,
            email: userCredentials.email,
            password: userCredentials.password
        }
    }

    static async updatePasswordHash(userId: number, newHashedPassword: string){
        try{
            await prisma.user.update(
                {where: {id: userId},
                data: {password: newHashedPassword}
            })
        }catch{
            throw new AppError('Erro ao atualizar dados do usuário.', 500, ErrorCode.UPDATE_DATABASE_ERROR)
        }
    }
    
}