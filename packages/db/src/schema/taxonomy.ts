import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, unique } from 'drizzle-orm/pg-core';

/**
 * La fórmula universal de VIBRA:
 *   Género → Accesorio → Tipo → Modelo → Tamaño → Color
 *
 * Los primeros cuatro niveles identifican el producto; los dos últimos
 * identifican la variante. Tipo y modelo cuelgan de su nivel superior, así
 * que el panel puede filtrar en cascada y no se pueden crear combinaciones
 * sin sentido como "Collar → Argolla". Tamaño y color son listas globales.
 */

export const genders = pgTable('genders', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  /** Marca las categorías cuyos productos se arman con otras piezas. */
  isSet: boolean('is_set').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const accessoryTypes = pgTable(
  'accessory_types',
  {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => [unique('accessory_types_category_slug_unique').on(t.categoryId, t.slug)],
);

export const models = pgTable(
  'models',
  {
    id: serial('id').primaryKey(),
    accessoryTypeId: integer('accessory_type_id')
      .notNull()
      .references(() => accessoryTypes.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => [unique('models_type_slug_unique').on(t.accessoryTypeId, t.slug)],
);

export const sizes = pgTable('sizes', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const colors = pgTable('colors', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  /** Para pintar los swatches en la tarjeta del catálogo. */
  hex: text('hex'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  accessoryTypes: many(accessoryTypes),
}));

export const accessoryTypesRelations = relations(accessoryTypes, ({ one, many }) => ({
  category: one(categories, {
    fields: [accessoryTypes.categoryId],
    references: [categories.id],
  }),
  models: many(models),
}));

export const modelsRelations = relations(models, ({ one }) => ({
  accessoryType: one(accessoryTypes, {
    fields: [models.accessoryTypeId],
    references: [accessoryTypes.id],
  }),
}));
