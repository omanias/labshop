import { Body, Controller, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@Controller('gemini')
export class GeminiController {
    constructor(private readonly geminiService: GeminiService) { }

    @Post('chat')
    async chat(@Body('prompt') prompt: string) {
        const text = await this.geminiService.generateText(prompt);
        return { text };
    }

    @Post('products')
    async queryProducts(@Body('query') query: string) {
        const result = await this.geminiService.queryProducts(query);
        return result;
    }

    @Post('purchase')
    async processPurchaseIntent(
        @Body('query') query: string,
        @Body('quantity') quantity: number = 1,
    ) {
        const result = await this.geminiService.processPurchaseIntent(query, quantity);
        return result;
    }

    @Post('cart/:cartId/query')
    async queryCart(
        @Param('cartId', ParseIntPipe) cartId: number,
        @Body('query') query: string,
    ) {
        const result = await this.geminiService.queryCartProducts(cartId, query);
        return result;
    }

    @Patch('cart/:cartId/edit')
    async editCart(
        @Param('cartId', ParseIntPipe) cartId: number,
        @Body('query') query: string,
    ) {
        const result = await this.geminiService.editCart(cartId, query);
        return result;
    }
}
