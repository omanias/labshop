import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GeminiService } from '../gemini/gemini.service';
import { TwilioService } from './twilio.service';

@Controller('webhook')
export class TwilioController {
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
            console.log('[WHATSAPP][INCOMING] Body recibido:', JSON.stringify(body, null, 2));

            const parsedMessage = this.twilioService.parseWebhook(body);

            if (!parsedMessage) {
                console.warn('[WHATSAPP][INCOMING] No se pudo parsear el mensaje');
                res.type('text/xml');
                return res.send(this.twilioService.generateWebhookResponse());
            }

            const { from, text } = parsedMessage;

            const { response, products } = await this.geminiService.queryProducts(text);
            let finalReply = response || 'No tengo respuesta 😅';

            if (products && products.length > 0) {
                finalReply += '\n\n📦 Productos disponibles:\n';
                products.forEach((p) => {
                    finalReply += `• ${p.tipo_prenda} (${p.talla}) - Color: ${p.color}\n  Precio: $${p.precio_50_u}\n`;
                });
            }


            try {
                await this.twilioService.sendWhatsappMessage(from, finalReply);
            } catch (sendError: any) {
                console.error('[WHATSAPP][INCOMING] ❌ Error al enviar:', {
                    message: sendError.message,
                    code: sendError.code,
                });
            }

            res.type('text/xml');
            return res.send(this.twilioService.generateWebhookResponse());
        } catch (e: any) {
            console.error('[WHATSAPP][ERROR] Error general:', {
                message: e.message,
                stack: e.stack,
            });
            res.type('text/xml');
            return res.send(this.twilioService.generateWebhookResponse());
        }
    }
}
