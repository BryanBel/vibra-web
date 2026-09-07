import { authContract } from './auth.js';
import { pricingContract } from './pricing.js';
import { taxonomyContract } from './taxonomy.js';

/**
 * Contrato de la API.
 *
 * Es la fuente única de verdad: NestJS lo implementa con `@Implement` y el
 * sitio en Astro lo consume con un cliente tipado. Un cambio aquí rompe en
 * compilación de los dos lados, que es exactamente lo que se busca — el
 * punto de partida de este proyecto era tener los productos definidos dos
 * veces y que se desincronizaran en silencio.
 */
export const contract = {
  auth: authContract,
  pricing: pricingContract,
  taxonomy: taxonomyContract,
};

export * from './auth.js';
export * from './common.js';
export * from './pricing.js';
export * from './taxonomy.js';
