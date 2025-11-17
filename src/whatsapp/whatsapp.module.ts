import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { GeminiModule } from '../gemini/gemini.module';
import { TwilioModule } from './twilio.module';

@Module({
    imports: [GeminiModule, TwilioModule],
    controllers: [WhatsappController],
})
export class WhatsappModule { }
