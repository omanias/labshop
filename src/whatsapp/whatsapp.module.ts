// src/whatsapp/whatsapp.module.ts
import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { GeminiService } from '../gemini/gemini.service';

@Module({
    controllers: [WhatsappController],
    providers: [GeminiService],
})
export class WhatsappModule { }
