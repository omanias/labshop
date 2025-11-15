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
            // Normalizar a formato E.164: +5493512660233
            from = `+${from.replace(/\D/g, '')}`;
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
            await this.sendWhatsappMessage(from, finalReply);

            return { status: 'sent' };
        } catch (e) {
            console.error('[WHATSAPP][ERROR]', e);
            return { status: 'error' };
        }
    }

    // 📤 Enviar mensaje de texto por WhatsApp Cloud API
    private async sendWhatsappMessage(to: string, text: string) {
        const url = `https://graph.facebook.com/v24.0/${process.env.PHONE_NUMBER_ID}/messages`;

        console.log('[WHATSAPP][SEND] URL =', url);
        console.log('[WHATSAPP][SEND] To =', to);
        console.log('[WHATSAPP][SEND] Text =', text);

        await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                to,
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
    }
}
