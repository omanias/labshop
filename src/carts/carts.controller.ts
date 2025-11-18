import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('carts')
export class CartsController {
    constructor(private readonly cartsService: CartsService) { }

    // POST /carts
    @Post()
    async createCart(@Body() dto: CreateCartDto) {
        const cart = await this.cartsService.createCart(dto);
        return cart;
    }

    // GET /carts/:id
    @Get(':id')
    async getCartDetail(@Param('id', ParseIntPipe) id: number) {
        return this.cartsService.getCartDetail(id);
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

    // PATCH /carts/:cartId/items/:itemId
    @Patch(':cartId/items/:itemId')
    @HttpCode(200)
    async updateCartItem(
        @Param('cartId', ParseIntPipe) cartId: number,
        @Param('itemId', ParseIntPipe) itemId: number,
        @Body() dto: UpdateCartItemDto,
    ) {
        return this.cartsService.updateCartItem(cartId, itemId, dto);
    }

    // DELETE /carts/:cartId/items/:itemId
    @Delete(':cartId/items/:itemId')
    @HttpCode(200)
    async removeCartItem(
        @Param('cartId', ParseIntPipe) cartId: number,
        @Param('itemId', ParseIntPipe) itemId: number,
    ) {
        return this.cartsService.removeCartItem(cartId, itemId);
    }

    // DELETE /carts/:id
    @Delete(':id')
    @HttpCode(200)
    async deleteCart(@Param('id', ParseIntPipe) id: number) {
        return this.cartsService.deleteCart(id);
    }
}
