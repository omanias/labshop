import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from './product.entity';

@Entity('cart_items')
export class CartItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'cart_id' })
    cartId: number;

    @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart: Cart;

    @Column({ name: 'product_id' })
    productId: number;

    @ManyToOne(() => Product, (product) => product.cartItems)
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ type: 'int' })
    qty: number;
}
