import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private readonly productsRepo: Repository<Product>,
    ) { }

    async findAll(q?: string): Promise<Product[]> {
        if (q) {
            return this.productsRepo.find({
                where: [
                    { tipo_prenda: ILike(`%${q}%`) },
                    { categoria: ILike(`%${q}%`) },
                    { color: ILike(`%${q}%`) },
                    { descripcion: ILike(`%${q}%`) },
                ],
            });
        }
        return this.productsRepo.find();
    }

    async findOne(id: number): Promise<Product> {
        const product = await this.productsRepo.findOne({ where: { id } });
        if (!product) {
            throw new NotFoundException('Product not found');
        }
        return product;
    }

    async create(dto: CreateProductDto): Promise<Product> {
        const product = this.productsRepo.create({
            ...dto,
            disponible: dto.disponible ?? true,
        });
        return this.productsRepo.save(product);
    }

    async update(id: number, dto: UpdateProductDto): Promise<Product> {
        const product = await this.findOne(id);
        this.productsRepo.merge(product, dto);
        return this.productsRepo.save(product);
    }

    async delete(id: number): Promise<void> {
        const product = await this.findOne(id);
        await this.productsRepo.remove(product);
    }
}
