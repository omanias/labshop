import {
    Column,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { CartItem } from './cart-item.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100 })
    tipo_prenda: string;

    @Column({ type: 'varchar', length: 50 })
    talla: string;

    @Column({ type: 'varchar', length: 50 })
    color: string;

    @Column({ type: 'int' })
    cantidad_disponible: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    precio_50_u: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    precio_100_u: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    precio_200_u: number;

    @Column({ type: 'boolean', default: true })
    disponible: boolean;

    @Column({ type: 'varchar', length: 100 })
    categoria: string;

    @Column({ type: 'text' })
    descripcion: string;

    @OneToMany(() => CartItem, (item) => item.product)
    cartItems: CartItem[];


    getPriceForQuantity(qty: number): number {
        if (qty >= 200) {
            return Number(this.precio_200_u);
        } else if (qty >= 100) {
            return Number(this.precio_100_u);
        } else {
            return Number(this.precio_50_u);
        }
    }
}
