export interface EmailMessage{
    to: string,
    subject: string,
    html: string,
    text: string
    priority?: 'high'
}

export type EmailContent = Omit<EmailMessage, 'to' | 'priority'>

export interface EmailSender{
    send(message: EmailMessage): Promise<void>
}