import { RegisterUserDTO, UserResponseDTO } from "types/user"
import { users } from '../models/users'
import bcrypt from 'bcrypt'

export class userRepository {

    static async userCreate(data: RegisterUserDTO): Promise<UserResponseDTO>{
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(data.password, salt)

        const newUser = await users.create({
            ...data,
            password: hashedPassword
        } as any) as any

        return {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email
        }
    }

    static async userFindByEmail(data: RegisterUserDTO){

    }
    
}