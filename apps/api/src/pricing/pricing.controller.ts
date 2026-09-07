import { Controller } from '@nestjs/common';
import { Implement, ORPCError, implement } from '@orpc/nest';
import { contract } from '@vibra/contracts';
import { ExchangeRateService } from './exchange-rate.service.js';

/**
 * Implementa el tramo de precios del contrato.
 *
 * Las rutas y los tipos de entrada y salida vienen de `@vibra/contracts`;
 * aquí solo va la lógica. Si el contrato cambia, esto deja de compilar.
 */
@Controller()
export class PricingController {
  constructor(private readonly exchangeRate: ExchangeRateService) {}

  @Implement(contract.pricing.current)
  current() {
    return implement(contract.pricing.current).handler(async () => {
      const snapshot = await this.exchangeRate.getCurrent();

      if (!snapshot) {
        throw new ORPCError('NOT_FOUND', { message: 'Todavía no hay una tasa registrada.' });
      }

      return {
        rate: snapshot.rate,
        currency: 'VES' as const,
        basis: 'bcv_eur' as const,
        effectiveDate: snapshot.effectiveDate,
        isManualOverride: snapshot.isManualOverride,
        ageInDays: snapshot.ageInDays,
      };
    });
  }

  /**
   * TODO(auth): proteger con el guard de administrador en cuanto exista
   * AuthModule. Hoy queda abierto y solo debe usarse en desarrollo.
   */
  @Implement(contract.pricing.refresh)
  refresh() {
    return implement(contract.pricing.refresh).handler(async () => {
      const snapshot = await this.exchangeRate.refresh();

      if (!snapshot) {
        throw new ORPCError('SERVICE_UNAVAILABLE', {
          message: 'Ninguna fuente respondió y no hay tasa previa.',
        });
      }

      return {
        rate: snapshot.rate,
        currency: 'VES' as const,
        basis: 'bcv_eur' as const,
        effectiveDate: snapshot.effectiveDate,
        isManualOverride: snapshot.isManualOverride,
        ageInDays: snapshot.ageInDays,
      };
    });
  }
}
