import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { UPLOADS_DIR } from './common/upload.util';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:5173,http://localhost:5174',
  );

  const allowedOrigins = corsOrigin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = Number.parseInt(configService.get<string>('PORT', '3000'), 10) || 3000;
  const host = configService.get<string>('HOST', '127.0.0.1');
  await app.listen(port, host);
}

bootstrap();
