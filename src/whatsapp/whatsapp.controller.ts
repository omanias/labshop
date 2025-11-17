import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GeminiService } from '../gemini/gemini.service';
import { TwilioService } from './twilio.service';

@Controller('webhook')
export class WhatsappController {
    constructor(
        private readonly geminiService: GeminiService,
        private readonly twilioService: TwilioService,
    ) { }

    // ✅ GET webhook - Para verificación inicial (compatibilidad)
    @Get()
    verify(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ) {
        console.log('[WHATSAPP][VERIFY] GET request recibido');
        return res.status(200).send('OK');
    }

    // ✅ POST webhook - Aquí llegan los mensajes de Twilio WhatsApp
    @Post()
    async receiveMessage(@Body() body: any, @Res() res: Response) {
        try {
            const isDev = process.env.NODE_ENV !== 'production';

            // Parsear el webhook de Twilio
            const parsedMessage = this.twilioService.parseWebhook(body);

            if (!parsedMessage) {
                res.type('text/xml');
                return res.send(this.twilioService.generateWebhookResponse());
            }

            const { from, text } = parsedMessage;

            if (isDev) {
                console.log('[WhatsApp] Message from:', from, 'Text:', text);
            }

            // 🔮 Llamar a Gemini para generar la respuesta
            const reply = await this.geminiService.generateText(text);
            const finalReply = reply || 'No tengo respuesta 😅';

            // 📤 Responder por WhatsApp a través de Twilio
            try {
                await this.twilioService.sendWhatsappMessage(from, finalReply);
            } catch (sendError: any) {
                console.error('[WhatsApp] Send failed:', sendError.message);
            }

            // Responder a Twilio con XML válido
            res.type('text/xml');
            return res.send(this.twilioService.generateWebhookResponse());
        } catch (e: any) {
            console.error('[WhatsApp] Error:', e.message);
            res.type('text/xml');
            return res.send(this.twilioService.generateWebhookResponse());
        }
    }
}
