import { createTransport, type Transporter } from 'nodemailer'
import { EmailSender, EmailMessage } from "./EmailSender";

interface SmtpEmailSenderConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

const IMPLICIT_TLS_PORT = 465;

export class SmtpEmailSender implements EmailSender{
    private readonly transporter: Transporter

    constructor(private readonly config: SmtpEmailSenderConfig){
        const secure = config.port === IMPLICIT_TLS_PORT;
        const hasLogin = Boolean(config.user);

        this.transporter = createTransport({
            host: config.host,
            port: config.port,
            secure,
            requireTLS: hasLogin && !secure,
            auth: hasLogin ? { user: config.user, pass: config.pass } : undefined,
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 20_000,
        })
    }

    async send({to, subject, html, text}: EmailMessage): Promise<void>{
        return await this.transporter.sendMail({from: this.config.from, to, subject, html, text})
    }
}