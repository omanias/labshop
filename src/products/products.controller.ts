import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    // GET /products?q=
    @Get()
    async getProducts(@Query() query: ProductQueryDto) {
        return this.productsService.findAll(query.q);
    }

    // POST /products
    @Post()
    async createProduct(@Body() dto: CreateProductDto) {
        return this.productsService.create(dto);
    }

    // GET /products/:id
    @Get(':id')
    async getProduct(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findOne(id);
    }

    // PATCH /products/:id
    @Patch(':id')
    async updateProduct(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProductDto,
    ) {
        return this.productsService.update(id, dto);
    }

    // DELETE /products/:id
    @Delete(':id')
    async deleteProduct(@Param('id', ParseIntPipe) id: number) {
        await this.productsService.delete(id);
        return { message: 'Product deleted successfully' };
    }
}
