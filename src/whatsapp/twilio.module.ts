import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { GeminiModule } from 'src/gemini/gemini.module';


@Module({
    imports: [GeminiModule],
    providers: [TwilioService],
    exports: [TwilioService],
})
export class TwilioModule { }
