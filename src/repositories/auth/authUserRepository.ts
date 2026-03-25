import { EmailCode } from '../../types/auth'
import nodemailer from "nodemailer"
import "dotenv/config"

export class AuthUserRepository {

    static async sendEmailVerificationCode(data: EmailCode){
        try{
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.USER_EMAIL,
                    pass: process.env.USER_PASSWORD
                }
            })
            await transporter.sendMail({
                from: "OrçaFácil",
                to: data.email,
                subject: "Código de verificação",
                html:`
                    <h2>Seu código de verificação</h2>
                    <p>Use o código abaixo para confirmar seu cadastro:</p>
                    <h1>${data.code}</h1>
                    <p>Esse código expira em 10 minutos.</p>
                `
            })
        }catch(error){
            throw new Error('Erro ao enviar email de verificação. Entre em contato!')
        }
    }

    static async getVerificationCode(){
        //
    }

}