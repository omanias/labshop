import {
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateProductDto {
    @IsString()
    tipo_prenda: string;

    @IsString()
    talla: string;

    @IsString()
    color: string;

    @IsInt()
    @Min(0)
    cantidad_disponible: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    precio_50_u: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    precio_100_u: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    precio_200_u: number;

    @IsOptional()
    disponible?: boolean;

    @IsString()
    categoria: string;

    @IsString()
    descripcion: string;
}
