import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe, VersioningType, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import { createTraceIdMiddleware } from './common/middleware/trace-id.middleware';
import { initTracing } from './otel/tracing';

// Initialize tracing (no-op if disabled)
initTracing();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 4000;
  const corsOrigin = (config.get<string>('CORS_ORIGIN') ?? '').split(',').map(s => s.trim()).filter(Boolean);

  // Security headers (CSP, nosniff) and cookies
  const isProd = (config.get<string>('NODE_ENV') || 'development') === 'production'
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'none'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }));
  app.use(cookieParser());
  app.use(createTraceIdMiddleware());

  // Body size limits
  const http = app.getHttpAdapter().getInstance();
  http.use(express.json({ limit: '10mb' }));
  http.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.enableCors({
    origin: corsOrigin.length > 0 ? corsOrigin : true,
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: [{ path: 'metrics', method: RequestMethod.GET }] });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Strong ETag for GET caching
  if (http.set) {
    http.set('etag', 'strong');
    http.disable('x-powered-by');
  }

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    forbidUnknownValues: false,
    validationError: { target: false, value: false },
  }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EPOP API')
    .setDescription('REST API documentation for EPOP backend')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: false });
  // Expose raw OpenAPI JSON
  try {
    (http as any).get('/docs-json', (_req: any, res: any) => res.json(document))
  } catch {}

  await app.listen(port);
}
bootstrap();
