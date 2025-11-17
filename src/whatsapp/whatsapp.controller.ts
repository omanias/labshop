// src/whatsapp/whatsapp.controller.ts
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { GeminiService } from '../gemini/gemini.service';

@Controller('webhook')
export class WhatsappController {
    constructor(private readonly geminiService: GeminiService) { }

    // ✅ Verificación del webhook (Meta te llama con GET al configurarlo)
    @Get()
    verify(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ) {
        console.log('[WHATSAPP][VERIFY] mode=', mode, 'token=', token);

        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            console.log('[WHATSAPP][VERIFY] Webhook verificado correctamente ✔️');
            return res.status(200).send(challenge);
        }

        console.error('[WHATSAPP][VERIFY] Token inválido o modo incorrecto');
        return res.status(403).send('Forbidden');
    }

    // ✅ Aquí llegan los mensajes de WhatsApp (POST desde Meta)
    @Post()
    async receiveMessage(@Body() body: any) {
        try {
            console.log('[WHATSAPP][INCOMING] body =', JSON.stringify(body, null, 2));

            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (!message) {
                console.warn('[WHATSAPP][INCOMING] No message in payload');
                return { status: 'no-message' };
            }

            // Número de quien envía el mensaje
            let from = message.from as string; // ej: "5493512660233"

            // Normalizar quitando cualquier cosa rara, PERO SIN AGREGAR +
            from = from.replace(/\D/g, ''); // -> "5493512660233"
            console.log('[WHATSAPP][INCOMING] From (normalized) =', from);

            const text = message.text?.body as string | undefined;

            if (!text) {
                console.warn('[WHATSAPP][INCOMING] Message without text');
                return { status: 'no-text' };
            }

            console.log('[WHATSAPP][INCOMING] Text =', text);

            // 🔮 Llamar a Gemini para generar la respuesta
            const reply = await this.geminiService.generateText(text);
            const finalReply = reply || 'No tengo respuesta 😅';

            console.log('[WHATSAPP][OUTGOING] Reply =', finalReply);

            // 📤 Responder por WhatsApp
            try {
                await this.sendWhatsappMessage(from, finalReply);
                console.log('[WHATSAPP][INCOMING] ✅ Mensaje enviado exitosamente');
                return { status: 'sent' };
            } catch (sendError: any) {
                console.error('[WHATSAPP][INCOMING] ❌ Error al enviar:', {
                    status: sendError.response?.status,
                    data: sendError.response?.data,
                    message: sendError.message,
                });
                return { status: 'error', sendError: sendError.message };
            }
        } catch (e: any) {
            console.error('[WHATSAPP][ERROR] Error general:', {
                message: e.message,
                stack: e.stack,
            });
            return { status: 'error', error: e.message };
        }
    }

    // 📤 Enviar mensaje de texto por WhatsApp Cloud API
    private async sendWhatsappMessage(to: string, text: string) {
        const url = `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`;

        // Normalizar el número: quitar + si existe, solo dígitos
        const normalizedTo = to.replace(/\D/g, '');

        console.log('[WHATSAPP][SEND] URL =', url);
        console.log('[WHATSAPP][SEND] To =', normalizedTo);
        console.log('[WHATSAPP][SEND] Text =', text);
        console.log('[WHATSAPP][SEND] Token (primeros 10) =', process.env.WHATSAPP_TOKEN?.slice(0, 10));
        console.log('[WHATSAPP][SEND] Phone Number ID =', process.env.PHONE_NUMBER_ID);

        try {
            const response = await axios.post(
                url,
                {
                    messaging_product: 'whatsapp',
                    to: normalizedTo,
                    type: 'text',
                    text: { body: text },
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            console.log('[WHATSAPP][SEND] ✅ Respuesta:', JSON.stringify(response.data, null, 2));
            return response.data;
        } catch (error: any) {
            console.error('[WHATSAPP][SEND] ❌ Error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
            });
            throw error;
        }
    }
}
