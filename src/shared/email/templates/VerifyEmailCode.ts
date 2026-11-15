import { EmailContent } from '@/shared/email/EmailSender'
import { renderEmail } from '@/shared/email/templates/Layout'

interface VerifyEmailCodeData {
    code: string
    expiresInMinutes: number
}

export function verifyEmailCode({ code, expiresInMinutes }: VerifyEmailCodeData): EmailContent {
    return renderEmail('Confirme seu e-mail no OrçaFácil', {
        heading: 'Olá!',
        paragraphs: ['Use o código abaixo para confirmar seu e-mail no OrçaFácil.'],
        code,
        note: `O código vale por ${expiresInMinutes} minutos. Se você não criou uma conta no OrçaFácil, ignore este e-mail.`
    })
}