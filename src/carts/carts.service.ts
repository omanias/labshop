// src/carts/carts.service.ts
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';
import { Product } from '../entities/product.entity';
import { CreateCartDto } from './dto/create-cart.dto';

@Injectable()
export class CartsService {
    constructor(
        @InjectRepository(Cart)
        private readonly cartRepo: Repository<Cart>,
        @InjectRepository(CartItem)
        private readonly cartItemRepo: Repository<CartItem>,
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
    ) { }

    async createCart(dto: CreateCartDto) {
        if (!dto.items || dto.items.length === 0) {
            throw new BadRequestException('Cart must have at least one item');
        }

        const positiveItems = dto.items.filter((i) => i.qty > 0);
        if (positiveItems.length === 0) {
            throw new BadRequestException('All quantities are zero');
        }

        const productIds = [...new Set(positiveItems.map((i) => i.product_id))];

        const products = await this.productRepo.find({
            where: { id: In(productIds) },
            select: ['id', 'cantidad_disponible', 'disponible'],
        });

        if (products.length !== productIds.length) {
            throw new NotFoundException('Some products not found');
        }

        // Validar disponibilidad
        for (const item of positiveItems) {
            const product = products.find((p) => p.id === item.product_id);
            if (!product || !product.disponible) {
                throw new BadRequestException(
                    `Product ${item.product_id} is not available`,
                );
            }
            if (product.cantidad_disponible < item.qty) {
                throw new BadRequestException(
                    `Insufficient stock for product ${item.product_id}`,
                );
            }
        }

        const cart = this.cartRepo.create({
            items: positiveItems.map((i) =>
                this.cartItemRepo.create({
                    productId: i.product_id,
                    qty: i.qty,
                }),
            ),
        });

        const saved = await this.cartRepo.save(cart);
        return this.cartRepo.findOne({
            where: { id: saved.id },
            relations: ['items', 'items.product'],
        });
    }

    async updateCart(id: number, dto: CreateCartDto) {
        const cart = await this.cartRepo.findOne({
            where: { id },
            relations: ['items'],
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        // Borrar todos los items actuales
        await this.cartItemRepo.delete({ cartId: id });

        const positiveItems = dto.items.filter((i) => i.qty > 0);

        if (positiveItems.length > 0) {
            const productIds = [...new Set(positiveItems.map((i) => i.product_id))];
            const products = await this.productRepo.find({
                where: { id: In(productIds) },
                select: ['id', 'cantidad_disponible', 'disponible'],
            });

            if (products.length !== productIds.length) {
                throw new NotFoundException('Some products not found');
            }

            // Validar disponibilidad
            for (const item of positiveItems) {
                const product = products.find((p) => p.id === item.product_id);
                if (!product || !product.disponible) {
                    throw new BadRequestException(
                        `Product ${item.product_id} is not available`,
                    );
                }
                if (product.cantidad_disponible < item.qty) {
                    throw new BadRequestException(
                        `Insufficient stock for product ${item.product_id}`,
                    );
                }
            }

            const newItems = positiveItems.map((i) =>
                this.cartItemRepo.create({
                    cartId: id,
                    productId: i.product_id,
                    qty: i.qty,
                }),
            );
            await this.cartItemRepo.save(newItems);
        }

        return this.cartRepo.findOne({
            where: { id },
            relations: ['items', 'items.product'],
        });
    }

    async getCart(id: number) {
        const cart = await this.cartRepo.findOne({
            where: { id },
            relations: ['items', 'items.product'],
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        return cart;
    }
}
