import { Injectable } from '@nestjs/common';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
    private twilioClient: any;
    private accountSid: string;
    private authToken: string;
    private whatsappNumber: string;

    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID!;
        this.authToken = process.env.TWILIO_AUTH_TOKEN!;
        this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER!;

        this.twilioClient = twilio(this.accountSid, this.authToken);

        const isDev = process.env.NODE_ENV !== 'production';
        if (isDev) {
            console.log('[TWILIO] Initialized ✅');
        }
    }

    /**
     * Enviar mensaje de WhatsApp a través de Twilio
     */
    async sendWhatsappMessage(to: string, text: string): Promise<any> {
        try {
            const recipientNumber = `whatsapp:+${to.replace(/\D/g, '')}`;
            const isDev = process.env.NODE_ENV !== 'production';

            const message = await this.twilioClient.messages.create({
                from: this.whatsappNumber,
                to: recipientNumber,
                body: text,
            });

            if (isDev) {
                console.log('[TWILIO] Message sent:', message.sid);
            }

            return {
                success: true,
                sid: message.sid,
                status: message.status,
            };
        } catch (error: any) {
            console.error('[TWILIO] Send error:', error.message);
            throw error;
        }
    }

    /**
     * Parsear webhook de Twilio
     */
    parseWebhook(body: any): {
        from: string;
        text: string;
        messageId: string;
    } | null {
        try {
            const from = body.From?.replace('whatsapp:', '') || '';
            const text = body.Body || '';
            const messageId = body.MessageSid || '';

            if (!from || !text) {
                return null;
            }

            return {
                from: from.replace(/\D/g, ''),
                text,
                messageId,
            };
        } catch (error: any) {
            console.error('[TWILIO] Parse error:', error.message);
            return null;
        }
    }

    /**
     * Generar respuesta XML para Twilio (sigue esperando respuesta)
     */
    generateWebhookResponse(): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;
    }
}
