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

    async sendWhatsappMessage(to: string, text: string): Promise<any> {
        try {
            const recipientNumber = `whatsapp:+${to.replace(/\D/g, '')}`;
            const isDev = process.env.NODE_ENV !== 'production';

            console.log('[TWILIO] Attempting to send message to:', recipientNumber);
            console.log('[TWILIO] Message length:', text.length);
            console.log('[TWILIO] Message preview:', text.substring(0, 100));

            const message = await this.twilioClient.messages.create({
                from: this.whatsappNumber,
                to: recipientNumber,
                body: text,
            });

            console.log('[TWILIO] Message created with SID:', message.sid);
            console.log('[TWILIO] Message status:', message.status);
            console.log('[TWILIO] Error code:', message.errorCode);
            console.log('[TWILIO] Error message:', message.errorMessage);
            console.log('[TWILIO] Full response:', JSON.stringify(message, null, 2));

            if (message.errorCode) {
                console.error('[TWILIO] ❌ Message has error code:', message.errorCode);
                console.error('[TWILIO] ❌ Error details:', message.errorMessage);
            }

            return {
                success: true,
                sid: message.sid,
                status: message.status,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
            };
        } catch (error: any) {
            console.error('[TWILIO] ❌ Send error:', error.message);
            console.error('[TWILIO] ❌ Error code:', error.code);
            console.error('[TWILIO] ❌ Error status:', error.status);
            console.error('[TWILIO] ❌ Full error:', JSON.stringify(error, null, 2));
            throw error;
        }
    }

    parseWebhook(body: any): {
        from: string;
        text: string;
        messageId: string;
    } | null {
        try {
            const from = body.From?.replace('whatsapp:', '') || '';
            let text = body.Body || '';
            const messageId = body.MessageSid || '';

            if (!from || !text) {
                return null;
            }

            // Decode UTF-8 properly (Twilio sends Latin-1 encoded UTF-8)
            try {
                text = Buffer.from(text, 'latin1').toString('utf8');
            } catch (decodeError) {
                console.warn('[TWILIO] UTF-8 decode warning:', decodeError);
                // Keep original text if decode fails
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

    generateWebhookResponse(): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;
    }
}
