import {
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    tipo_prenda?: string;

    @IsOptional()
    @IsString()
    talla?: string;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    cantidad_disponible?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    precio_50_u?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    precio_100_u?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    precio_200_u?: number;

    @IsOptional()
    disponible?: boolean;

    @IsOptional()
    @IsString()
    categoria?: string;

    @IsOptional()
    @IsString()
    descripcion?: string;
}
