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

        console.log('[TWILIO] Servicio inicializado ✅');
        console.log('[TWILIO] Account SID:', this.accountSid?.slice(0, 10));
        console.log('[TWILIO] WhatsApp Number:', this.whatsappNumber);
    }

    /**
     * Enviar mensaje de WhatsApp a través de Twilio
     */
    async sendWhatsappMessage(to: string, text: string): Promise<any> {
        try {
            // Normalizar el número: agregar "whatsapp:" al inicio
            const recipientNumber = `whatsapp:+${to.replace(/\D/g, '')}`;

            console.log('[TWILIO][SEND] Enviando a:', recipientNumber);
            console.log('[TWILIO][SEND] Texto:', text);

            const message = await this.twilioClient.messages.create({
                from: this.whatsappNumber,
                to: recipientNumber,
                body: text,
            });

            console.log('[TWILIO][SEND] ✅ Mensaje enviado. SID:', message.sid);
            return {
                success: true,
                sid: message.sid,
                status: message.status,
            };
        } catch (error: any) {
            console.error('[TWILIO][SEND] ❌ Error:', {
                code: error.code,
                message: error.message,
                details: error.details,
            });
            throw error;
        }
    }

    /**
     * Parsear webhook de Twilio
     * Twilio envía los datos como form-urlencoded
     */
    parseWebhook(body: any): {
        from: string;
        text: string;
        messageId: string;
    } | null {
        try {
            console.log('[TWILIO][WEBHOOK] Body recibido:', body);

            // Twilio envía los números con "whatsapp:" al inicio
            const from = body.From?.replace('whatsapp:', '') || '';
            const text = body.Body || '';
            const messageId = body.MessageSid || '';

            if (!from || !text) {
                console.warn('[TWILIO][WEBHOOK] Datos incompletos');
                return null;
            }

            console.log('[TWILIO][WEBHOOK] From:', from);
            console.log('[TWILIO][WEBHOOK] Text:', text);
            console.log('[TWILIO][WEBHOOK] MessageSid:', messageId);

            return {
                from: from.replace(/\D/g, ''), // Solo dígitos
                text,
                messageId,
            };
        } catch (error: any) {
            console.error('[TWILIO][WEBHOOK] ❌ Error al parsear:', error.message);
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
