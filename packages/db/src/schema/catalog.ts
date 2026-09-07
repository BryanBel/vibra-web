import { relations, sql, type SQL } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  unique,
} from 'drizzle-orm/pg-core';
import { timestamps, tsvector } from './_shared.js';
import { productStatusEnum, setStockModeEnum } from './enums.js';
import { accessoryTypes, categories, colors, genders, models, sizes } from './taxonomy.js';

/**
 * Un producto son los primeros cuatro niveles de la fórmula
 * (Género → Accesorio → Tipo → Modelo): lo que tiene página, nombre,
 * descripción y fotos. Los dos niveles restantes viven en las variantes.
 */
export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),

    genderId: integer('gender_id')
      .notNull()
      .references(() => genders.id, { onDelete: 'restrict' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    accessoryTypeId: integer('accessory_type_id').references(() => accessoryTypes.id, {
      onDelete: 'restrict',
    }),
    modelId: integer('model_id').references(() => models.id, { onDelete: 'restrict' }),

    status: productStatusEnum('status').notNull().default('draft'),
    isFeatured: boolean('is_featured').notNull().default(false),

    /**
     * Solo para productos de una categoría marcada como set. `own` lleva
     * inventario propio; `components` lo deriva de las piezas en `set_items`.
     */
    setStockMode: setStockModeEnum('set_stock_mode'),

    /**
     * Texto plano que la API compone al guardar, juntando nombre,
     * descripción y los nombres de taxonomía. Existe porque una columna
     * generada no puede leer filas de otras tablas.
     */
    searchText: text('search_text'),

    /**
     * Se deriva de `search_text` con la configuración `spanish_unaccent`,
     * creada en la migración inicial. Al ir sin acentos y con raíces en
     * español, "corazon" encuentra "Corazón".
     */
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      (): SQL => sql`to_tsvector('spanish_unaccent', coalesce(${products.searchText}, ''))`,
    ),

    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),

    ...timestamps,
  },
  (t) => [
    index('products_search_idx').using('gin', t.searchVector),
    index('products_status_idx').on(t.status),
    index('products_category_idx').on(t.categoryId),
  ],
);

/**
 * Una variante son los dos últimos niveles (Tamaño → Color): lo que tiene
 * SKU, precio y existencias. Es la unidad que realmente se vende.
 */
export const productVariants = pgTable(
  'product_variants',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sizeId: integer('size_id').references(() => sizes.id, { onDelete: 'restrict' }),
    colorId: integer('color_id').references(() => colors.id, { onDelete: 'restrict' }),

    sku: text('sku').notNull().unique(),
    /** Precio base en dólares. El monto en bolívares se calcula al vuelo. */
    priceUsd: numeric('price_usd', { precision: 10, scale: 2 }).notNull(),
    /** Precio tachado, para mostrar una rebaja. */
    compareAtPriceUsd: numeric('compare_at_price_usd', { precision: 10, scale: 2 }),

    stock: integer('stock').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),

    ...timestamps,
  },
  (t) => [
    unique('product_variants_combo_unique').on(t.productId, t.sizeId, t.colorId),
    index('product_variants_product_idx').on(t.productId),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    alt: text('alt'),
    sortOrder: integer('sort_order').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (t) => [index('product_images_product_idx').on(t.productId)],
);

/**
 * Piezas que componen un set. Solo se usan cuando el set está en modo
 * `components`: la disponibilidad es el mínimo de `stock / quantity` entre
 * todas sus piezas, así nunca se vende un set cuyo componente se agotó.
 */
export const setItems = pgTable(
  'set_items',
  {
    id: serial('id').primaryKey(),
    setProductId: integer('set_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    componentVariantId: integer('component_variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
  },
  (t) => [unique('set_items_unique').on(t.setProductId, t.componentVariantId)],
);

/**
 * Las colecciones son la capa comercial, separada de la taxonomía: agrupan
 * productos por cómo se venden, no por qué son. "Para el oído" reúne
 * zarcillos y earcuffs sin tocar la clasificación de ninguno.
 */
export const collections = pgTable('collections', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  heroImageUrl: text('hero_image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const productCollections = pgTable(
  'product_collections',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    collectionId: integer('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.collectionId] })],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  gender: one(genders, { fields: [products.genderId], references: [genders.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  accessoryType: one(accessoryTypes, {
    fields: [products.accessoryTypeId],
    references: [accessoryTypes.id],
  }),
  model: one(models, { fields: [products.modelId], references: [models.id] }),
  variants: many(productVariants),
  images: many(productImages),
  setItems: many(setItems),
  collections: many(productCollections),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  size: one(sizes, { fields: [productVariants.sizeId], references: [sizes.id] }),
  color: one(colors, { fields: [productVariants.colorId], references: [colors.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const setItemsRelations = relations(setItems, ({ one }) => ({
  set: one(products, { fields: [setItems.setProductId], references: [products.id] }),
  componentVariant: one(productVariants, {
    fields: [setItems.componentVariantId],
    references: [productVariants.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(productCollections),
}));

export const productCollectionsRelations = relations(productCollections, ({ one }) => ({
  product: one(products, { fields: [productCollections.productId], references: [products.id] }),
  collection: one(collections, {
    fields: [productCollections.collectionId],
    references: [collections.id],
  }),
}));
