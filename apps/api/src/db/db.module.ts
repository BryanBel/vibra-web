import { Global, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb, type Database } from '@vibra/db';
import type { Env } from '../config/env.js';

/** Token de inyección del cliente de Drizzle. */
export const DB = Symbol('DB');

/**
 * Módulo global de base de datos.
 *
 * Expone un único cliente de Drizzle para toda la aplicación. Es global
 * porque prácticamente todos los módulos consultan la base, y repetir el
 * import en cada uno solo agrega ruido.
 */
@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Database => {
        return createDb(config.get('DATABASE_URL', { infer: true }), { max: 10 });
      },
    },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    // postgres.js cierra sus conexiones al terminar el proceso; este gancho
    // existe para que el apagado ordenado de Nest tenga dónde engancharse
    // cuando Railway envíe SIGTERM en un despliegue.
  }
}
