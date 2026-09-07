import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Tasa de cambio vigente.
 *
 * Los precios se cargan en dólares; este es el factor con el que el sitio
 * los muestra también en bolívares.
 */
export const rateSnapshotSchema = z.object({
  /** Bolívares por dólar de precio de lista. */
  rate: z.number().positive(),
  currency: z.literal('VES'),
  /** De dónde sale el factor: la tasa del euro del BCV. */
  basis: z.literal('bcv_eur'),
  /** Fecha de vigencia según el BCV, en formato ISO. */
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Verdadero si Gillary la fijó a mano desde el panel. */
  isManualOverride: z.boolean(),
  /**
   * Días transcurridos desde la vigencia. Si empieza a crecer, algo dejó
   * de actualizarse y conviene mirarlo.
   */
  ageInDays: z.number().int().nonnegative(),
});

export type RateSnapshot = z.infer<typeof rateSnapshotSchema>;

export const pricingContract = {
  current: oc
    .route({
      method: 'GET',
      path: '/rate',
      summary: 'Tasa de cambio vigente',
      tags: ['Precios'],
    })
    .output(rateSnapshotSchema),

  refresh: oc
    .route({
      method: 'POST',
      path: '/rate/refresh',
      summary: 'Fuerza una consulta de la tasa sin esperar al cron',
      tags: ['Precios'],
    })
    .output(rateSnapshotSchema),
};
