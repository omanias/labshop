import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
    imports: [GeminiModule],
    controllers: [WhatsappController],
})
export class WhatsappModule { }
