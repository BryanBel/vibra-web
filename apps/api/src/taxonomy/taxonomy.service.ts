import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/nest';
import type { TaxonomyTree } from '@vibra/contracts';
import { schema, type Database } from '@vibra/db';
import { asc, eq } from 'drizzle-orm';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { DB } from '../db/db.module.js';

/**
 * Cualquiera de las seis tablas de taxonomía. Todas comparten `id`,
 * `sortOrder` y `name`, que es lo que necesitan las operaciones genéricas.
 */
type TaxonomyTable = PgTableWithColumns<any>;

@Injectable()
export class TaxonomyService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Árbol completo para los filtros del catálogo.
   *
   * Se arma con seis consultas planas en paralelo y se anida en memoria, en
   * vez de con joins anidados: son pocas filas y así cada nivel conserva su
   * propio orden sin depender de cómo desordene el join.
   */
  async getTree(): Promise<TaxonomyTree> {
    const [genders, categories, accessoryTypes, models, sizes, colors] = await Promise.all([
      this.db.select().from(schema.genders).orderBy(asc(schema.genders.sortOrder)),
      this.db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
      this.db.select().from(schema.accessoryTypes).orderBy(asc(schema.accessoryTypes.sortOrder)),
      this.db.select().from(schema.models).orderBy(asc(schema.models.sortOrder)),
      this.db.select().from(schema.sizes).orderBy(asc(schema.sizes.sortOrder)),
      this.db.select().from(schema.colors).orderBy(asc(schema.colors.sortOrder)),
    ]);

    const modelsByType = new Map<number, typeof models>();
    for (const model of models) {
      const list = modelsByType.get(model.accessoryTypeId) ?? [];
      list.push(model);
      modelsByType.set(model.accessoryTypeId, list);
    }

    const typesByCategory = new Map<number, typeof accessoryTypes>();
    for (const type of accessoryTypes) {
      const list = typesByCategory.get(type.categoryId) ?? [];
      list.push(type);
      typesByCategory.set(type.categoryId, list);
    }

    return {
      genders,
      sizes,
      colors,
      categories: categories.map((category) => ({
        ...category,
        accessoryTypes: (typesByCategory.get(category.id) ?? []).map((type) => ({
          ...type,
          models: modelsByType.get(type.id) ?? [],
        })),
      })),
    };
  }

  async create<T>(table: TaxonomyTable, values: Record<string, unknown>): Promise<T> {
    try {
      const [row] = await this.db.insert(table).values(values).returning();
      return row as T;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update<T>(table: TaxonomyTable, id: number, values: Record<string, unknown>): Promise<T> {
    const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));

    if (Object.keys(clean).length === 0) {
      throw new ORPCError('BAD_REQUEST', { message: 'No se envió ningún campo que cambiar.' });
    }

    try {
      const [row] = await this.db.update(table).set(clean).where(eq(table.id, id)).returning();
      if (!row) throw new ORPCError('NOT_FOUND', { message: 'No existe ese registro.' });
      return row as T;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async remove(table: TaxonomyTable, id: number): Promise<{ ok: true }> {
    try {
      const [row] = await this.db.delete(table).where(eq(table.id, id)).returning();
      if (!row) throw new ORPCError('NOT_FOUND', { message: 'No existe ese registro.' });
      return { ok: true };
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Traduce los errores de Postgres a algo que el panel pueda mostrar.
   *
   * Importa sobre todo la violación de clave foránea: significa que la
   * categoría o el color siguen en uso por algún producto, y borrarlos
   * dejaría el catálogo inconsistente. El esquema usa `restrict` justamente
   * para que la base lo impida en vez de confiar en la interfaz.
   */
  private translate(error: unknown): unknown {
    if (error instanceof ORPCError) return error;

    const cause = (error as { cause?: { code?: string; constraint_name?: string } }).cause;

    if (cause?.code === '23503') {
      return new ORPCError('CONFLICT', {
        message: 'No se puede borrar: hay productos que todavía lo usan.',
      });
    }

    if (cause?.code === '23505') {
      return new ORPCError('CONFLICT', {
        message: 'Ya existe un registro con ese identificador.',
      });
    }

    return error;
  }
}
