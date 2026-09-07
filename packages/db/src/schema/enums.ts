import { pgEnum } from 'drizzle-orm/pg-core';
import {
  ADMIN_ROLES,
  CART_STATUSES,
  DELIVERY_KINDS,
  DISCOUNT_TYPES,
  EXCHANGE_RATE_SOURCES,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRODUCT_STATUSES,
  SET_STOCK_MODES,
  STOCK_MOVEMENT_REASONS,
} from '@vibra/contracts';

/**
 * Los tipos enumerados de Postgres se construyen a partir de las constantes
 * de @vibra/contracts, para que la base de datos y la validación de la API no
 * puedan quedar desalineadas.
 */
export const productStatusEnum = pgEnum('product_status', PRODUCT_STATUSES);
export const setStockModeEnum = pgEnum('set_stock_mode', SET_STOCK_MODES);
export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES);
export const paymentMethodEnum = pgEnum('payment_method', PAYMENT_METHODS);
export const paymentStatusEnum = pgEnum('payment_status', PAYMENT_STATUSES);
export const orderChannelEnum = pgEnum('order_channel', ORDER_CHANNELS);
export const deliveryKindEnum = pgEnum('delivery_kind', DELIVERY_KINDS);
export const discountTypeEnum = pgEnum('discount_type', DISCOUNT_TYPES);
export const cartStatusEnum = pgEnum('cart_status', CART_STATUSES);
export const stockMovementReasonEnum = pgEnum('stock_movement_reason', STOCK_MOVEMENT_REASONS);
export const adminRoleEnum = pgEnum('admin_role', ADMIN_ROLES);
export const exchangeRateSourceEnum = pgEnum('exchange_rate_source', EXCHANGE_RATE_SOURCES);
