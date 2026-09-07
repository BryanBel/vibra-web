import { Module } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service.js';
import { PricingController } from './pricing.controller.js';

@Module({
  controllers: [PricingController],
  providers: [ExchangeRateService],
  exports: [ExchangeRateService],
})
export class PricingModule {}
