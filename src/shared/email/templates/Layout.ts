import { EmailContent } from "../EmailSender";

interface EmailBody{
    heading: string
    paragraphs: string[]
    code?: string
    note: string
}

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}

export function escapeHtml(value: string): string{
    return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

export function renderEmail(subject: string, { heading, paragraphs, code, note }: EmailBody): EmailContent {
    const htmlParagraphs = paragraphs
        .map((text) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px;">${escapeHtml(text)}</p>`)
        .join('')

    const htmlCode = code
        ? `<p style="margin:8px 0 24px;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;font-family:Consolas,Menlo,monospace;">${escapeHtml(code)}</p>`
        : ''

    const html = `<!doctype html>
        <html lang="pt-BR">
        <head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
        <body style="margin:0;padding:0;background:#f9fafb;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
        <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <tr><td>
        <p style="margin:0 0 24px;font-size:20px;font-weight:700;">OrçaFácil</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;">${escapeHtml(heading)}</h1>
        ${htmlParagraphs}${htmlCode}
        <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#6b7280;">${escapeHtml(note)}</p>
        </td></tr>
        </table>
        </td></tr>
        </table>
        </body>
        </html>`

    const text = [heading, ...paragraphs, ...(code ? [code] : []), note, '— OrçaFácil'].join('\n\n')

    return { subject, html, text }
}