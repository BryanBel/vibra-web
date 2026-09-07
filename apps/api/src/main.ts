import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.use(cookieParser());

  // Todo cuelga de /api, para que Netlify pueda enrutar por prefijo sin
  // chocar con las rutas del sitio.
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    // El carrito viaja en una cookie httpOnly, así que hacen falta.
    credentials: true,
  });

  // La validación va por ruta con ZodValidationPipe, usando los esquemas
  // de @vibra/contracts que el sitio también reutiliza. Por eso no se instala
  // la ValidationPipe global, que depende de class-validator.

  // Railway envía SIGTERM al redesplegar; sin esto se cortan peticiones
  // en curso.
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(`API escuchando en http://localhost:${port}/api`);
}

await bootstrap();
