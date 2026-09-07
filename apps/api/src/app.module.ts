import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ORPCModule } from '@orpc/nest';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health/health.controller.js';
import { PricingModule } from './pricing/pricing.module.js';
import { TaxonomyModule } from './taxonomy/taxonomy.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // En producción las variables las inyecta Railway; en desarrollo
      // se leen del .env del propio paquete.
      envFilePath: ['.env'],
    }),
    // Conecta los controladores decorados con @Implement al contrato de
    // @vibra/contracts. Las rutas y los tipos salen de ahí, no de aquí.
    ORPCModule.forRoot({
      eventIteratorKeepAliveInterval: 5000,
    }),
    ScheduleModule.forRoot(),
    DbModule,
    AuthModule,
    PricingModule,
    TaxonomyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
