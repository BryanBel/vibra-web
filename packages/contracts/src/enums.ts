/**
 * Enums del dominio VIBRA.
 *
 * Fuente única de verdad: Drizzle los usa para construir los pgEnum del
 * esquema, y Zod los usa para validar la entrada de la API. Si un valor
 * cambia aquí, cambia en los dos lados a la vez.
 */

/** Estado de publicación de un producto. */
export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/**
 * Cómo lleva inventario un set.
 * - `own`: Gillary arma cierta cantidad y carga ese número.
 * - `components`: la disponibilidad se calcula desde el stock de sus piezas.
 */
export const SET_STOCK_MODES = ['own', 'components'] as const;
export type SetStockMode = (typeof SET_STOCK_MODES)[number];

/** Ciclo de vida de un pedido. */
export const ORDER_STATUSES = [
  'pending_payment',
  'payment_review',
  'paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Medios de pago. No hay pasarela: el cliente paga por fuera y reporta la
 * referencia, y Gillary la verifica desde el panel. `whatsapp` significa que
 * la compra se cerró por chat en vez de por la web.
 */
export const PAYMENT_METHODS = [
  'pago_movil',
  'transferencia',
  'zelle',
  'binance',
  'whatsapp',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Estado de verificación del pago. */
export const PAYMENT_STATUSES = ['unpaid', 'reported', 'verified', 'rejected'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Por dónde entró el pedido. */
export const ORDER_CHANNELS = ['web', 'whatsapp'] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

/**
 * Modalidades de entrega.
 * - `point`: punto de encuentro gratuito (Plaza Venezuela).
 * - `pickup`: retiro en San Antonio o El Valle, gratuito.
 * - `delivery`: a domicilio en Caracas, con tarifa por zona.
 * - `national`: agencia nacional, flete por cobrar en destino.
 */
export const DELIVERY_KINDS = ['point', 'pickup', 'delivery', 'national'] as const;
export type DeliveryKind = (typeof DELIVERY_KINDS)[number];

/** Tipo de descuento de un cupón. */
export const DISCOUNT_TYPES = ['percent', 'fixed_usd'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

/** Estado de un carrito. */
export const CART_STATUSES = ['active', 'converted', 'abandoned'] as const;
export type CartStatus = (typeof CART_STATUSES)[number];

/** Motivo de un movimiento de inventario, para poder auditarlo. */
export const STOCK_MOVEMENT_REASONS = [
  'order',
  'restock',
  'adjustment',
  'cancellation',
] as const;
export type StockMovementReason = (typeof STOCK_MOVEMENT_REASONS)[number];

/** Rol de un usuario del panel. */
export const ADMIN_ROLES = ['owner', 'staff'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * Fuente de la tasa de cambio. Los precios se cargan en dólares y se
 * muestran en bolívares multiplicando por la tasa del euro del BCV.
 */
export const EXCHANGE_RATE_SOURCES = ['bcv_eur'] as const;
export type ExchangeRateSource = (typeof EXCHANGE_RATE_SOURCES)[number];
