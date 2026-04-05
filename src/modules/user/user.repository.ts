import { UserTypes } from "@/modules/user/user.types"
import { prisma } from "@/lib/prisma"

export class userRepository {

    static async findByEmail(email: string): Promise<UserTypes['UserResponse']>{
        const data =  await prisma.user.findUnique({
            where: {email},
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true
            }
        })
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
        const dataUser = await prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: data.password
            }
        })
        if(!dataUser) return null
        return {
            id: dataUser.id,
            email: dataUser.email,
            name: dataUser.name,
            createdAt: dataUser.createdAt,
            updatedAt: dataUser.updatedAt
        }
    }

    static async returnLoginCredentials(email: string): Promise<UserTypes['UserCredentials']>{
        const userCredentials = await prisma.user.findUnique({
            where: {email},
            select: {
                id: true,
                email: true,
                password: true
            }
        })
        if(!userCredentials) return null
        return {
            id: userCredentials.id,
            email: userCredentials.email,
            password: userCredentials.password
        }
    }
    
}