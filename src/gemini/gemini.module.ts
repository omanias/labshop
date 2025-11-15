import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { ProductsModule } from '../products/products.module';
import { CartsModule } from '../carts/carts.module';

@Module({
    imports: [ProductsModule, CartsModule],
    providers: [GeminiService],
    controllers: [GeminiController],
    exports: [GeminiService],
})
export class GeminiModule { }
