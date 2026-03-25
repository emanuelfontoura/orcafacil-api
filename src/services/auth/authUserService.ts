import validator from 'validator'
import { AuthUserVerifyDTO, AuthUserConfirmDTO, UserInfo } from '../../types/auth'
import { AuthUserRepository } from 'repositories/auth/authUserRepository'
import { userRepository } from 'repositories/user/userRepository'
import { redis } from 'lib/redis'
import bcrypt from "bcrypt" 

export class AuthUserService{

    static async verifyEmail(data: AuthUserVerifyDTO):Promise<UserInfo>{
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

        const hashedPassword = await bcrypt.hash(data.password, await bcrypt.genSalt(10))
        // Save on Redis
        const code = Math.floor(100000 + Math.random() * 900000).toString()

        try{
            await redis.set(
                `verify:${data.email}`,
                JSON.stringify({
                    code,
                    name: data.name,
                    password: hashedPassword
                }),
                "EX",
                600
            )
        }catch(error){
            throw new Error('Erro ao salvar código de verificação. Entre em contato!')
        }

        await AuthUserRepository.sendEmailVerificationCode({email: data.email, code})

        return {email: data.email, name: data.name}
    }

    static async confirmEmail(data: AuthUserConfirmDTO){
        //
    }

}