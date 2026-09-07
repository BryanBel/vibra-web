import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { schema, type Database } from '@vibra/db';
import { desc, eq } from 'drizzle-orm';
import type { Env } from '../config/env.js';
import { DB } from '../db/db.module.js';

export interface RateSnapshot {
  /** Bolívares por dólar de precio de lista. */
  rate: number;
  effectiveDate: string;
  isManualOverride: boolean;
  /** Cuántos días tiene la tasa. Si crece mucho, algo dejó de actualizarse. */
  ageInDays: number;
}

interface FetchedRate {
  rate: number;
  effectiveDate: string;
}

/**
 * Tasa de cambio para mostrar precios en bolívares.
 *
 * Los precios se cargan en dólares y se convierten multiplicando por la
 * tasa del euro del BCV, que es lo que hace el comercio en Venezuela
 * porque va por encima de la del dólar oficial.
 *
 * Tres niveles de respaldo, para que el sitio nunca muestre un precio roto:
 *   1. ve.dolarapi.com, que devuelve la tasa oficial ya estructurada.
 *   2. Raspado de bcv.org.ve, que suele ir más adelantado porque el BCV
 *      publica la tasa del siguiente día hábil.
 *   3. La última fila guardada en la base.
 *
 * Además Gillary puede fijar una tasa a mano desde el panel, y esa gana
 * sobre cualquier consulta automática del mismo día.
 */
@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Si la base está vacía no hay con qué mostrar precios, así que se
    // consulta al arrancar en vez de esperar al primer cron.
    //
    // Nunca propaga el error: si Postgres no responde en este instante, la
    // API igual debe levantar para que /api/health pueda reportar el
    // problema. Un proceso que se niega a arrancar solo deja a Railway
    // reiniciando en bucle sin decir por qué.
    try {
      const latest = await this.readLatest();
      if (!latest) {
        this.logger.log('Sin tasa registrada; consultando al arrancar.');
        await this.refresh();
      }
    } catch (error) {
      this.logger.error(
        `No se pudo leer la tasa al arrancar: ${(error as Error).message}. ` +
          'La API levanta igual; revisar /api/health.',
      );
    }
  }

  /** Todos los días a las 8:05, hora de Caracas. */
  @Cron('5 8 * * *', { timeZone: 'America/Caracas' })
  async handleDailyRefresh(): Promise<void> {
    await this.refresh();
  }

  /**
   * Consulta las fuentes y guarda el resultado. Nunca lanza: si todo falla
   * deja el aviso en el log y se sigue usando la última tasa conocida.
   */
  async refresh(): Promise<RateSnapshot | null> {
    let fetched: FetchedRate | null = null;

    try {
      fetched = await this.fetchFromApi();
    } catch (error) {
      this.logger.warn(`La API de tasas falló: ${(error as Error).message}`);
    }

    if (!fetched) {
      try {
        fetched = await this.fetchFromBcv();
        this.logger.log('Tasa obtenida del respaldo por raspado del BCV.');
      } catch (error) {
        this.logger.warn(`El raspado del BCV falló: ${(error as Error).message}`);
      }
    }

    if (!fetched) {
      this.logger.error('Ninguna fuente respondió; se mantiene la última tasa guardada.');
      return this.getCurrent();
    }

    await this.db
      .insert(schema.exchangeRates)
      .values({
        source: 'bcv_eur',
        rate: fetched.rate.toFixed(8),
        effectiveDate: fetched.effectiveDate,
        isManualOverride: false,
      });

    this.logger.log(`Tasa actualizada: ${fetched.rate} Bs (vigencia ${fetched.effectiveDate}).`);
    return this.getCurrent();
  }

  /** Última tasa vigente, sea automática o fijada a mano. */
  async getCurrent(): Promise<RateSnapshot | null> {
    const row = await this.readLatest();
    if (!row) return null;

    const effectiveDate = row.effectiveDate;
    // El BCV publica por adelantado la tasa del siguiente día hábil, así
    // que una vigencia futura es normal y no significa que esté vencida.
    const ageInDays = Math.max(
      0,
      Math.floor(
        (Date.parse(`${this.caracasToday()}T00:00:00-04:00`) -
          Date.parse(`${effectiveDate}T00:00:00-04:00`)) /
          86_400_000,
      ),
    );

    return {
      rate: Number(row.rate),
      effectiveDate,
      isManualOverride: row.isManualOverride,
      ageInDays,
    };
  }

  /** Fija una tasa a mano desde el panel. */
  async setManualRate(rate: number, effectiveDate: string): Promise<RateSnapshot | null> {
    await this.db.insert(schema.exchangeRates).values({
      source: 'bcv_eur',
      rate: rate.toFixed(8),
      effectiveDate,
      isManualOverride: true,
    });

    this.logger.log(`Tasa fijada a mano: ${rate} Bs (vigencia ${effectiveDate}).`);
    return this.getCurrent();
  }

  /** Convierte un monto en dólares a bolívares, redondeado a dos decimales. */
  convertToBs(amountUsd: number | string, rate: number): number {
    return Math.round(Number(amountUsd) * rate * 100) / 100;
  }

  private async readLatest() {
    const [row] = await this.db
      .select()
      .from(schema.exchangeRates)
      .where(eq(schema.exchangeRates.source, 'bcv_eur'))
      // La vigencia manda; dentro de una misma fecha, lo que Gillary fijó a
      // mano gana sobre lo que trajo el cron, que es lo que hace que un
      // ajuste manual no se pierda con la siguiente consulta automática.
      .orderBy(
        desc(schema.exchangeRates.effectiveDate),
        desc(schema.exchangeRates.isManualOverride),
        desc(schema.exchangeRates.fetchedAt),
      )
      .limit(1);

    return row ?? null;
  }

  private async fetchFromApi(): Promise<FetchedRate> {
    const url = this.config.get('EXCHANGE_RATE_API_URL', { infer: true });
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as Array<{
      moneda?: string;
      fuente?: string;
      promedio?: number;
      fechaActualizacion?: string;
    }>;

    const oficial = payload.find((entry) => entry.fuente === 'oficial');
    if (!oficial?.promedio) {
      throw new Error('La respuesta no trae la tasa oficial');
    }

    return {
      rate: oficial.promedio,
      effectiveDate: (oficial.fechaActualizacion ?? new Date().toISOString()).slice(0, 10),
    };
  }

  /**
   * Respaldo: lee el bloque `id="euro"` de la portada del BCV, cuyo valor
   * viene en formato venezolano — punto para miles y coma para decimales.
   */
  private async fetchFromBcv(): Promise<FetchedRate> {
    const url = this.config.get('EXCHANGE_RATE_SCRAPE_URL', { infer: true });
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const start = html.indexOf('id="euro"');
    if (start === -1) {
      throw new Error('No se encontró el bloque del euro; el BCV cambió su portada');
    }

    const match = /<strong[^>]*>\s*([\d.,]+)\s*<\/strong>/.exec(html.slice(start, start + 1000));
    if (!match?.[1]) {
      throw new Error('No se pudo leer el valor dentro del bloque del euro');
    }

    const rate = Number(match[1].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Valor de tasa inesperado: ${match[1]}`);
    }

    return { rate, effectiveDate: this.caracasToday() };
  }

  /**
   * La fecha de hoy en Caracas, en formato ISO.
   *
   * No sirve `toISOString()`: da la fecha en UTC, y como Venezuela va cuatro
   * horas atrás, entre las 20:00 y la medianoche local ya sería el día
   * siguiente en UTC y la tasa quedaría fechada un día adelante.
   */
  private caracasToday(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}
