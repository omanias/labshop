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
        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        }
        return res.status(403).send('Forbidden');
    }

    // ✅ Aquí llegan los mensajes de WhatsApp
    @Post()
    async receiveMessage(@Body() body: any) {
        try {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (!message) return { status: 'no-message' };

            const from = message.from; // número del usuario
            const text = message.text?.body;

            if (!text) return { status: 'no-text' };

            // Llamar a Gemini
            const reply = await this.geminiService.generateText(text);

            // Responder por WhatsApp
            await this.sendWhatsappMessage(from, reply || 'No tengo respuesta 😅');

            return { status: 'sent' };
        } catch (e) {
            console.error(e);
            return { status: 'error' };
        }
    }

    private async sendWhatsappMessage(to: string, text: string) {
        const url = `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`;

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
