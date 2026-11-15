import { EmailContent } from '@/shared/email/EmailSender'
import { renderEmail } from '@/shared/email/templates/Layout'

interface RecoveryPasswordCodeData {
    code: string
    expiresInMinutes: number
}

export function recoveryPasswordCode({ code, expiresInMinutes }: RecoveryPasswordCodeData): EmailContent {
    return renderEmail('Redefinição de senha do OrçaFácil', {
        heading: 'Olá!',
        paragraphs: ['Recebemos um pedido para redefinir a senha da sua conta. Use o código abaixo para continuar.'],
        code,
        note: `O código vale por ${expiresInMinutes} minutos. Se não foi você, ignore este e-mail: sua senha continua a mesma.`
    })
}