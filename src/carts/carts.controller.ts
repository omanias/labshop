import {
    Body,
    Controller,
    HttpCode,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { CreateCartDto } from './dto/create-cart.dto';

@Controller('carts')
export class CartsController {
    constructor(private readonly cartsService: CartsService) { }

    // POST /carts
    @Post()
    async createCart(@Body() dto: CreateCartDto) {
        const cart = await this.cartsService.createCart(dto);
        return cart;
    }

    // PATCH /carts/:id
    @Patch(':id')
    @HttpCode(200)
    async updateCart(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateCartDto,
    ) {
        return this.cartsService.updateCart(id, dto);
    }
}
