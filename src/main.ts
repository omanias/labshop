import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const app = await NestFactory.create(AppModule, {
    logger: isProduction ? ['error'] : ['log', 'error', 'warn'],
    bufferLogs: true, // Buffer logs para reducir I/O
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      stopAtFirstError: true, // Parar en el primer error de validación
    }),
  );

  const port = process.env.PORT || 3000;
  if (!isProduction) {
    console.log(`[App] Starting on port ${port}`);
  }
  
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error]', err);
  process.exit(1);
});
