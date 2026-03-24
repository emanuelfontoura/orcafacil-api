import validator from 'validator'
import { AuthUserVerifyDTO, AuthUserConfirmDTO } from '../../types/auth'
import { AuthUserRepository } from 'repositories/auth/authUserRepository'
import { userRepository } from 'repositories/user/userRepository'

export class AuthUserService{

    static async verifyEmail(data: AuthUserVerifyDTO){
        const missingFields: string[] = []

        // Missing Fields
        if(!data.email) missingFields.push('email')
        if(!data.name) missingFields.push('nome')
        if(!data.password) missingFields.push('senha')
        if(!data.confirmPassword) missingFields.push('confirmação de senha')
        if(missingFields.length > 0) throw new Error(`Os seguintes campos ficaram sem preenchimento: ${missingFields.join(', ')}.`)

        // Email
        if(!validator.isEmail(data.email)) throw new Error('Formato de email inválido.')

        // Password
        if(data.password.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.')
        if(data.password !== data.confirmPassword) throw new Error('A senha e a confirmação de senha devem ser iguais.')

        // Email exists
        const user = await userRepository.findByEmail(data.email)
        if(user) throw new Error('Esse email já está cadastrado.')
    }

    static async confirmEmail(data: AuthUserConfirmDTO){
        //
    }

}