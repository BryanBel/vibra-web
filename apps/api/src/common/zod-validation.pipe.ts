import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Valida la entrada contra un esquema de Zod.
 *
 * Se usa Zod y no class-validator porque los mismos esquemas viven en
 * `@vibra/contracts` y los reutiliza el sitio en Astro: una sola definición
 * de qué es un pedido válido, en vez de una por cada lado.
 *
 *   @Post()
 *   crear(@Body(new ZodValidationPipe(crearPedidoSchema)) body: CrearPedido) {}
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Los datos enviados no son válidos.',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.') || '(raíz)',
          message: issue.message,
        })),
      });
    }

    return result.data;
  }
}
