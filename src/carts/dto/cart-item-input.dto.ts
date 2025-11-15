import { IsInt, Min } from 'class-validator';

export class CartItemInputDto {
    @IsInt()
    product_id: number;

    @IsInt()
    @Min(0)
    qty: number;
}
