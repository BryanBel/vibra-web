import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TaxonomyController } from './taxonomy.controller.js';
import { TaxonomyService } from './taxonomy.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TaxonomyController],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
