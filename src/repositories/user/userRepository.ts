import { User } from "../../types/user"
import { prisma } from "lib/prisma"

export class userRepository {

    static async findByEmail(email: string): Promise<User | null>{
        return await prisma.user.findUnique({
            where: {email},
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true
            }
        })
    }
    
}