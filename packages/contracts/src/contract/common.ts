import { z } from 'zod';

/** Identificador numérico en la ruta. Llega como texto y se convierte. */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Un slug legible: minúsculas, números y guiones. Se usa en las URLs, así
 * que se valida en vez de confiar en que quien lo escriba acierte.
 */
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones');

export const paginationInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24),
});

/** Envoltorio de listados paginados. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    perPage: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  });
}

export const okSchema = z.object({ ok: z.literal(true) });
