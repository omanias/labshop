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
            console.log('[WHATSAPP][INCOMING] Body received:', JSON.stringify(body, null, 2));

            const parsedMessage = this.twilioService.parseWebhook(body);

            if (!parsedMessage) {
                console.warn('[WHATSAPP][INCOMING] Could not parse message');
                res.type('text/xml');
                return res.send(this.twilioService.generateWebhookResponse());
            }

            const { from, text } = parsedMessage;
            const textLower = text.toLowerCase();

            const purchaseKeywords = ['comprar', 'quiero', 'necesito', 'voy a', 'dame', 'llevo', 'agregar', 'añadir', 'llevar', 'ordena', 'pedir'];
            const hasPurchaseIntent = purchaseKeywords.some((keyword) => textLower.includes(keyword));

            const removeKeywords = ['elimina', 'quita', 'borra', 'remove', 'borrar', 'delete', 'saca'];
            const isRemoveRequest = removeKeywords.some((keyword) => textLower.includes(keyword));

            const quantityKeywords = ['cambiar', 'cantidad', 'actualiz', 'más', 'menos', 'aumenta', 'disminuye', 'reduce'];
            const isQuantityChange = quantityKeywords.some((keyword) => textLower.includes(keyword));

            const isCartModification = isRemoveRequest || isQuantityChange;

            const cartIdMatch = text.match(/#(\d+)/);
            const cartIdFromText = cartIdMatch ? parseInt(cartIdMatch[1], 10) : null;

            let finalReply = '';
            let cartData = null;

            if (isCartModification && cartIdFromText) {
                console.log('[WHATSAPP][INCOMING] Cart modification detected for cart #', cartIdFromText);
                const editResult = await this.geminiService.editCart(cartIdFromText, text);
                finalReply = editResult.response || 'No tengo respuesta 😅';
                cartData = editResult.cart;

                if (cartData) {
                    console.log('[WHATSAPP][INCOMING] ✅ Cart updated successfully');
                }
            } else if (hasPurchaseIntent) {
                console.log('[WHATSAPP][INCOMING] Purchase intent detected, processing...');
                const purchaseResult = await this.geminiService.processPurchaseIntent(text, 1);
                finalReply = purchaseResult.response || 'No tengo respuesta 😅';
                cartData = purchaseResult.cart;

                if (cartData) {
                    console.log('[WHATSAPP][INCOMING] Cart created successfully:', (cartData as any).id);
                }
            } else {
                const { response, products } = await this.geminiService.queryProducts(text);
                finalReply = response || 'No tengo respuesta 😅';

                if (products && products.length > 0) {
                    finalReply += '\n\n📦 ';
                    products.forEach((p, i) => {
                        if (i < 3) {
                            finalReply += `${p.tipo_prenda} ${p.talla} (${p.color}) $${p.precio_50_u} | `;
                        }
                    });
                    finalReply = finalReply.slice(0, -3);
                }
            }

            if (finalReply.length > 1500) {
                finalReply = finalReply.substring(0, 1497) + '...';
            }

            console.log('[CONTROLLER] Final message to send:', finalReply);
            console.log('[CONTROLLER] Cart data:', cartData);

            try {
                await this.twilioService.sendWhatsappMessage(from, finalReply);
                console.log('[WHATSAPP][INCOMING] Message sent successfully to:', from);
            } catch (sendError: any) {
                console.error('[WHATSAPP][INCOMING] ❌ Error sending message:', {
                    message: sendError.message,
                    code: sendError.code,
                });
            }

            res.type('text/xml');
            return res.send(this.twilioService.generateWebhookResponse());
        } catch (e: any) {
            console.error('[WHATSAPP][ERROR] General error:', {
                message: e.message,
                stack: e.stack,
            });
            res.type('text/xml');
            return res.send(this.twilioService.generateWebhookResponse());
        }
    }
}
