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

    @Post()
    async receiveMessage(@Body() body: any, @Res() res: Response) {
        try {
            const isDev = process.env.NODE_ENV !== 'production';

            const parsedMessage = this.twilioService.parseWebhook(body);

            if (!parsedMessage) {
                res.type('text/xml');
                return res.send(this.twilioService.generateWebhookResponse());
            }

            const { from, text } = parsedMessage;

            if (isDev) {
                console.log('[WhatsApp] Message from:', from, 'Text:', text);
            }

            const reply = await this.geminiService.generateText(text);
            const finalReply = reply || 'No tengo respuesta 😅';

            try {
                await this.twilioService.sendWhatsappMessage(from, finalReply);
            } catch (sendError: any) {
                console.error('[WhatsApp] Send failed:', sendError.message);
            }

            res.type('text/xml');
            return res.send(this.twilioService.generateWebhookResponse());
        } catch (e: any) {
            console.error('[WhatsApp] Error:', e.message);
            res.type('text/xml');
            return res.send(this.twilioService.generateWebhookResponse());
        }
    }
}
