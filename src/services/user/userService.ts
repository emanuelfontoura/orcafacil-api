import { userRepository } from "../../repositories/user/userRepository";

export class userService {
    // static async userRegisterService(data: RegisterUserDTO): Promise<UserResponseDTO> {
    //     const missingFields: string[] = [] 
        
    //     if(!data.name) missingFields.push('nome')
    //     if(!data.email) missingFields.push('email')
    //     if(!data.password) missingFields.push('senha')
    //     if(!data.confirmPassword) missingFields.push('confirmação de senha')

    //     if(missingFields.length > 0){
    //         throw new Error(`Campos obrigatórios não preenchidos: ${missingFields.join(', ')}`)
    //     }

    //     if(data.password.length < 6){
    //         throw new Error('A senha deve ter no mínimo 6 caracteres.')
    //     }

    //     return userRepository.userCreate({
    //         name: data.name,
    //         email: data.email,
    //         password: data.password,
    //         confirmPassword: data.confirmPassword
    //     })
    // }
}