import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CartItemInputDto } from './cart-item-input.dto';

export class CreateCartDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CartItemInputDto)
    items: CartItemInputDto[];
}
