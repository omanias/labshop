import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { GeminiModule } from 'src/gemini/gemini.module';
import { TwilioController } from "./twilio.controller";


@Module({
    imports: [GeminiModule],
    providers: [TwilioService],
    controllers: [TwilioController],
    exports: [TwilioService],
})
export class TwilioModule { }
