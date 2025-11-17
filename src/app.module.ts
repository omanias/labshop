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
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';

        const host =
          config.get<string>('DB_HOST') ||
          config.get<string>('RDS_HOSTNAME') ||
          'localhost';

        const port = parseInt(
          config.get<string>('DB_PORT') ??
          config.get<string>('RDS_PORT') ??
          '5432',
          10,
        );

        const username =
          config.get<string>('DB_USER') ||
          config.get<string>('RDS_USERNAME') ||
          'postgres';

        const password =
          config.get<string>('DB_PASS') ||
          config.get<string>('RDS_PASSWORD') ||
          'postgres';

        const database =
          config.get<string>('DB_NAME') ||
          config.get<string>('RDS_DB_NAME') ||
          'labshop';

        if (!isProduction) {
          console.log('[DB CONFIG]', { host, port, username, database });
        }

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          autoLoadEntities: true,
          synchronize: !isProduction,
          ssl: false,
          logging: false,
          poolSize: isProduction ? 1 : 2,
          maxQueryExecutionTime: 1000,
          retryAttempts: 1,
          retryDelay: 1000,
        };
      },
    }),

    ProductsModule,
    CartsModule,
    GeminiModule,
    TwilioModule,
  ],
})
export class AppModule { }
