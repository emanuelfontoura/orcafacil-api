import { Request, Response } from 'express'
import { userService } from '../services/userService'
import { UserResponseDTO } from '../types/user'

export class userController {

    static async userRegisterController(req: Request, res: Response){
        try{
            const {email, name, password, confirmPassword} = req.body

            const user: UserResponseDTO = await userService.userRegisterService({
                name,
                email,
                password,
                confirmPassword
            }) 

            return res.status(201).json(user)

        }catch(error){
            if (error instanceof Error){
                return res.status(400).json({errorMessage: error.message})
            }
            return res.status(400).json({errorMessage: 'Erro desconhecido.'})
        }
    }

}