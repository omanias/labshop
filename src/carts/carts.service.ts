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

        const cart = this.cartRepo.create();
        const savedCart = await this.cartRepo.save(cart);

        const itemsToAdd = positiveItems.map((i) =>
            this.cartItemRepo.create({
                cartId: savedCart.id,
                productId: i.product_id,
                qty: i.qty,
            }),
        );

        await this.cartItemRepo.save(itemsToAdd);

        return this.cartRepo.findOne({
            where: { id: savedCart.id },
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

    async getCartDetail(id: number) {
        const cart = await this.cartRepo.findOne({
            where: { id },
            relations: ['items', 'items.product'],
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        const itemsDetail = cart.items.map((item) => {
            const subtotal = Number(item.product.precio_50_u) * item.qty;
            return {
                id: item.id,
                productId: item.productId,
                product: {
                    id: item.product.id,
                    tipo_prenda: item.product.tipo_prenda,
                    talla: item.product.talla,
                    color: item.product.color,
                    precio_unitario: Number(item.product.precio_50_u),
                    cantidad_disponible: item.product.cantidad_disponible,
                },
                qty: item.qty,
                subtotal: subtotal,
            };
        });

        const total = itemsDetail.reduce((sum, item) => sum + item.subtotal, 0);

        return {
            id: cart.id,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
            items: itemsDetail,
            total: total,
            itemCount: itemsDetail.length,
        };
    }

    async updateCartItem(
        cartId: number,
        itemId: number,
        dto: { qty: number },
    ) {
        const cart = await this.cartRepo.findOne({
            where: { id: cartId },
            relations: ['items'],
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        const item = await this.cartItemRepo.findOne({
            where: { id: itemId, cartId },
            relations: ['product'],
        });

        if (!item) {
            throw new NotFoundException('Item not found in cart');
        }

        if (item.product.cantidad_disponible < dto.qty) {
            throw new BadRequestException(
                `Insufficient stock. Available: ${item.product.cantidad_disponible}`,
            );
        }

        item.qty = dto.qty;
        await this.cartItemRepo.save(item);

        return this.getCartDetail(cartId);
    }

    async removeCartItem(cartId: number, itemId: number) {
        const cart = await this.cartRepo.findOne({
            where: { id: cartId },
            relations: ['items'],
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        const item = await this.cartItemRepo.findOne({
            where: { id: itemId, cartId },
        });

        if (!item) {
            throw new NotFoundException('Item not found in cart');
        }

        await this.cartItemRepo.delete({ id: itemId, cartId });

        return this.getCartDetail(cartId);
    }

    async deleteCart(id: number) {
        const cart = await this.cartRepo.findOne({
            where: { id },
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        await this.cartRepo.delete({ id });

        return { message: 'Cart deleted successfully', id };
    }
}
