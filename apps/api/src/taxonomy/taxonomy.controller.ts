import { Controller, UseGuards } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { contract } from '@vibra/contracts';
import { schema } from '@vibra/db';
import { AdminGuard } from '../auth/admin.guard.js';
import { TaxonomyService } from './taxonomy.service.js';

/**
 * Taxonomía.
 *
 * El árbol es público porque alimenta los filtros del catálogo; todo lo que
 * escribe exige sesión de panel. `@Implement` acepta un sub-contrato entero,
 * así que cada dimensión se resuelve en un método en vez de tres.
 *
 * Las llamadas a `implement` van escritas una por una a propósito: un helper
 * genérico obliga a tipar el sub-contrato como `any` y ahí se pierde
 * justamente la verificación contra el contrato, que es para lo que se
 * adoptó oRPC. La lógica sí es común y vive en el servicio.
 */
@Controller()
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Implement(contract.taxonomy.tree)
  tree() {
    return implement(contract.taxonomy.tree).handler(() => this.taxonomy.getTree());
  }

  @UseGuards(AdminGuard)
  @Implement(contract.taxonomy.genders)
  genders() {
    return {
      create: implement(contract.taxonomy.genders.create).handler(({ input }) =>
        this.taxonomy.create(schema.genders, input),
      ),
      update: implement(contract.taxonomy.genders.update).handler(({ input }) => {
        const { id, ...rest } = input;
        return this.taxonomy.update(schema.genders, id, rest);
      }),
      remove: implement(contract.taxonomy.genders.remove).handler(({ input }) =>
        this.taxonomy.remove(schema.genders, input.id),
      ),
    };
  }

  @UseGuards(AdminGuard)
  @Implement(contract.taxonomy.categories)
  categories() {
    return {
      create: implement(contract.taxonomy.categories.create).handler(({ input }) =>
        this.taxonomy.create(schema.categories, input),
      ),
      update: implement(contract.taxonomy.categories.update).handler(({ input }) => {
        const { id, ...rest } = input;
        return this.taxonomy.update(schema.categories, id, rest);
      }),
      remove: implement(contract.taxonomy.categories.remove).handler(({ input }) =>
        this.taxonomy.remove(schema.categories, input.id),
      ),
    };
  }

  @UseGuards(AdminGuard)
  @Implement(contract.taxonomy.accessoryTypes)
  accessoryTypes() {
    return {
      create: implement(contract.taxonomy.accessoryTypes.create).handler(({ input }) =>
        this.taxonomy.create(schema.accessoryTypes, input),
      ),
      update: implement(contract.taxonomy.accessoryTypes.update).handler(({ input }) => {
        const { id, ...rest } = input;
        return this.taxonomy.update(schema.accessoryTypes, id, rest);
      }),
      remove: implement(contract.taxonomy.accessoryTypes.remove).handler(({ input }) =>
        this.taxonomy.remove(schema.accessoryTypes, input.id),
      ),
    };
  }

  @UseGuards(AdminGuard)
  @Implement(contract.taxonomy.models)
  models() {
    return {
      create: implement(contract.taxonomy.models.create).handler(({ input }) =>
        this.taxonomy.create(schema.models, input),
      ),
      update: implement(contract.taxonomy.models.update).handler(({ input }) => {
        const { id, ...rest } = input;
        return this.taxonomy.update(schema.models, id, rest);
      }),
      remove: implement(contract.taxonomy.models.remove).handler(({ input }) =>
        this.taxonomy.remove(schema.models, input.id),
      ),
    };
  }

  @UseGuards(AdminGuard)
  @Implement(contract.taxonomy.sizes)
  sizes() {
    return {
      create: implement(contract.taxonomy.sizes.create).handler(({ input }) =>
        this.taxonomy.create(schema.sizes, input),
      ),
      update: implement(contract.taxonomy.sizes.update).handler(({ input }) => {
        const { id, ...rest } = input;
        return this.taxonomy.update(schema.sizes, id, rest);
      }),
      remove: implement(contract.taxonomy.sizes.remove).handler(({ input }) =>
        this.taxonomy.remove(schema.sizes, input.id),
      ),
    };
  }

  @UseGuards(AdminGuard)
  @Implement(contract.taxonomy.colors)
  colors() {
    return {
      create: implement(contract.taxonomy.colors.create).handler(({ input }) =>
        this.taxonomy.create(schema.colors, input),
      ),
      update: implement(contract.taxonomy.colors.update).handler(({ input }) => {
        const { id, ...rest } = input;
        return this.taxonomy.update(schema.colors, id, rest);
      }),
      remove: implement(contract.taxonomy.colors.remove).handler(({ input }) =>
        this.taxonomy.remove(schema.colors, input.id),
      ),
    };
  }
}
