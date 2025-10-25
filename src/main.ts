import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.modulo';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://0d3nt-frontend.vercel.app'],
    credentials: true,
  });

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API de Clínica Dental')
    .setDescription(
      'Documentación de la API para el sistema de gestión de clínica dental.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/documentacion', app, document);

  const puerto = process.env.PORT ?? 3000;
  await app.listen(puerto, '0.0.0.0');
  console.log(`Servidor corriendo en http://localhost:${puerto}`);
  console.log(
    `Documentación disponible en http://localhost:${puerto}/api/documentacion`,
  );
}
bootstrap();