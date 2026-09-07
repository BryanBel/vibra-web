import { oc } from '@orpc/contract';
import { z } from 'zod';
import { idParamSchema, okSchema, slugSchema } from './common.js';

/**
 * Taxonomía: la fórmula universal de VIBRA.
 *
 *   Género → Accesorio → Tipo → Modelo → Tamaño → Color
 *
 * Tipo y modelo cuelgan de su nivel superior, así que el panel filtra en
 * cascada y no se pueden crear combinaciones sin sentido como
 * "Collar → Argolla". Tamaño y color son listas globales.
 *
 * Todo esto es data editable, no código: agregar un color o un tipo de
 * accesorio es una fila, no un despliegue.
 */

const baseFields = {
  id: z.number().int().positive(),
  slug: slugSchema,
  name: z.string().min(1).max(120),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
};

export const genderSchema = z.object(baseFields);

export const categorySchema = z.object({
  ...baseFields,
  description: z.string().nullable(),
  /** Marca las categorías cuyos productos se arman con otras piezas. */
  isSet: z.boolean(),
});

export const modelSchema = z.object({ ...baseFields, accessoryTypeId: z.number().int() });

export const accessoryTypeSchema = z.object({
  ...baseFields,
  categoryId: z.number().int(),
});

export const sizeSchema = z.object(baseFields);

export const colorSchema = z.object({
  ...baseFields,
  /** Para pintar los swatches en la tarjeta del catálogo. */
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
});

/** Árbol completo, tal como lo consume el riel de filtros del catálogo. */
export const taxonomyTreeSchema = z.object({
  genders: z.array(genderSchema),
  categories: z.array(
    categorySchema.extend({
      accessoryTypes: z.array(accessoryTypeSchema.extend({ models: z.array(modelSchema) })),
    }),
  ),
  sizes: z.array(sizeSchema),
  colors: z.array(colorSchema),
});

export type TaxonomyTree = z.infer<typeof taxonomyTreeSchema>;

/**
 * Campos escribibles.
 *
 * `sortOrder` e `isActive` van opcionales y NO con `.default()`: un default
 * de Zod se aplica también cuando el esquema se vuelve parcial para una
 * actualización, así que editar solo el nombre reseteaba el orden a cero.
 * Los valores por defecto ya viven en la base, que es donde corresponden.
 */
const writableBase = {
  slug: slugSchema,
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
};

/**
 * Construye las cuatro operaciones de administración de una dimensión.
 *
 * Las seis dimensiones se manejan igual, así que generarlas evita repetir
 * el mismo bloque seis veces y que se desincronicen entre sí.
 */
function crudFor<TItem extends z.ZodTypeAny, TShape extends z.ZodRawShape>(
  // oRPC tipa las rutas como plantilla literal, así que el parámetro debe
  // conservar esa forma o el genérico la degrada a `string`.
  path: `/${string}`,
  tag: string,
  item: TItem,
  create: z.ZodObject<TShape>,
) {
  return {
    create: oc
      .route({ method: 'POST', path, tags: [tag] })
      .input(create)
      .output(item),
    update: oc
      .route({ method: 'PATCH', path: `${path}/{id}`, tags: [tag] })
      // El id viene de la ruta y el resto del cuerpo; oRPC los junta en un
      // solo objeto de entrada, por eso se combinan en un mismo esquema.
      .input(create.partial().extend(idParamSchema.shape))
      .output(item),
    remove: oc
      .route({ method: 'DELETE', path: `${path}/{id}`, tags: [tag] })
      .input(idParamSchema)
      .output(okSchema),
  };
}

const TAG = 'Taxonomía';

export const taxonomyContract = {
  /** Árbol completo. Público: alimenta los filtros del catálogo. */
  tree: oc
    .route({ method: 'GET', path: '/taxonomy', summary: 'Taxonomía completa', tags: [TAG] })
    .output(taxonomyTreeSchema),

  genders: crudFor('/admin/taxonomy/genders', TAG, genderSchema, z.object(writableBase)),

  categories: crudFor(
    '/admin/taxonomy/categories',
    TAG,
    categorySchema,
    z.object({
      ...writableBase,
      description: z.string().max(500).nullish(),
      isSet: z.boolean().optional(),
    }),
  ),

  accessoryTypes: crudFor(
    '/admin/taxonomy/accessory-types',
    TAG,
    accessoryTypeSchema,
    z.object({ ...writableBase, categoryId: z.number().int().positive() }),
  ),

  models: crudFor(
    '/admin/taxonomy/models',
    TAG,
    modelSchema,
    z.object({ ...writableBase, accessoryTypeId: z.number().int().positive() }),
  ),

  sizes: crudFor('/admin/taxonomy/sizes', TAG, sizeSchema, z.object(writableBase)),

  colors: crudFor(
    '/admin/taxonomy/colors',
    TAG,
    colorSchema,
    z.object({
      ...writableBase,
      hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color hexadecimal como #7A1E2C').nullish(),
    }),
  ),
};
