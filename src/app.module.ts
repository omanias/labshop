import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductsModule } from './products/products.module';
import { CartsModule } from './carts/carts.module';
import { GeminiModule } from './gemini/gemini.module';
import { TwilioModule } from './whatsapp/twilio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT') ?? '5432', 10),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
        ssl: false,
        logging: false,
        poolSize: 2,
        maxQueryExecutionTime: 1000,
        retryAttempts: 3, // Limitar intentos de reconexión
        retryDelay: 3000,
      }),
    }),
    ProductsModule,
    CartsModule,
    GeminiModule,
    TwilioModule,
  ],
})
export class AppModule { }
