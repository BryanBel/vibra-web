/**
 * Semilla de datos estructurales.
 *
 * Solo carga lo que no depende del criterio de Gillary: los estados de
 * Venezuela, las modalidades de entrega ya acordadas, las colecciones
 * iniciales y el esqueleto de la taxonomía. El catálogo real —productos,
 * precios, fotos y existencias— se carga desde el panel.
 *
 * Es idempotente: se puede correr varias veces sin duplicar nada.
 *
 *   pnpm --filter @vibra/db seed
 */
import 'dotenv/config';
import { createDb } from './client.js';
import {
  accessoryTypes,
  categories,
  collections,
  colors,
  deliveryOptions,
  genders,
  models,
  sizes,
  states,
} from './schema/index.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'Falta DATABASE_URL. Copia packages/db/.env.example a .env y pega la conexión directa de Neon.',
  );
}

const db = createDb(connectionString, { max: 1 });

/** Las 24 entidades federales, para el envío nacional por agencia. */
const VENEZUELAN_STATES = [
  'Amazonas',
  'Anzoátegui',
  'Apure',
  'Aragua',
  'Barinas',
  'Bolívar',
  'Carabobo',
  'Cojedes',
  'Delta Amacuro',
  'Distrito Capital',
  'Falcón',
  'Guárico',
  'La Guaira',
  'Lara',
  'Mérida',
  'Miranda',
  'Monagas',
  'Nueva Esparta',
  'Portuguesa',
  'Sucre',
  'Táchira',
  'Trujillo',
  'Yaracuy',
  'Zulia',
] as const;

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seed() {
  console.log('Sembrando datos estructurales...');

  // --- Géneros ---------------------------------------------------------
  await db
    .insert(genders)
    .values([
      { slug: 'mujer', name: 'Mujer', sortOrder: 1 },
      { slug: 'hombre', name: 'Hombre', sortOrder: 2 },
      { slug: 'unisex', name: 'Unisex', sortOrder: 3 },
    ])
    .onConflictDoNothing();
  console.log('  géneros');

  // --- Categorías ------------------------------------------------------
  // Earcuffs va como categoría propia y no como tipo de zarcillo: no
  // necesita perforación, así que es otra necesidad del cliente. La
  // colección "Para el oído" los vuelve a juntar más abajo.
  await db
    .insert(categories)
    .values([
      { slug: 'zarcillos', name: 'Zarcillos', sortOrder: 1 },
      { slug: 'earcuffs', name: 'Earcuffs', sortOrder: 2 },
      { slug: 'collares', name: 'Collares', sortOrder: 3 },
      { slug: 'pulseras', name: 'Pulseras', sortOrder: 4 },
      { slug: 'cadenas-de-mano', name: 'Cadenas de mano', sortOrder: 5 },
      { slug: 'cadenas-de-cintura', name: 'Cadenas de cintura', sortOrder: 6 },
      { slug: 'sets', name: 'Sets', isSet: true, sortOrder: 7 },
    ])
    .onConflictDoNothing();
  console.log('  categorías');

  // --- Tipos y modelos -------------------------------------------------
  // Solo se siembra el ejemplo confirmado (Zarcillo → Argolla → Lisa).
  // El resto lo agrega Gillary desde el panel, que es donde conoce el
  // vocabulario real de cada accesorio.
  const zarcillos = await db.query.categories.findFirst({
    where: (c, { eq }) => eq(c.slug, 'zarcillos'),
  });

  if (zarcillos) {
    await db
      .insert(accessoryTypes)
      .values([{ categoryId: zarcillos.id, slug: 'argolla', name: 'Argolla', sortOrder: 1 }])
      .onConflictDoNothing();

    const argolla = await db.query.accessoryTypes.findFirst({
      where: (t, { and, eq }) => and(eq(t.categoryId, zarcillos.id), eq(t.slug, 'argolla')),
    });

    if (argolla) {
      await db
        .insert(models)
        .values([{ accessoryTypeId: argolla.id, slug: 'lisa', name: 'Lisa', sortOrder: 1 }])
        .onConflictDoNothing();
    }
  }
  console.log('  tipos y modelos (ejemplo inicial)');

  // --- Tamaños y colores -----------------------------------------------
  await db
    .insert(sizes)
    .values([
      { slug: 'pequena', name: 'Pequeña', sortOrder: 1 },
      { slug: 'mediana', name: 'Mediana', sortOrder: 2 },
      { slug: 'grande', name: 'Grande', sortOrder: 3 },
      { slug: 'ajustable', name: 'Ajustable', sortOrder: 4 },
    ])
    .onConflictDoNothing();

  await db
    .insert(colors)
    .values([
      { slug: 'dorada', name: 'Dorada', hex: '#C9A227', sortOrder: 1 },
      { slug: 'plateada', name: 'Plateada', hex: '#C0C0C0', sortOrder: 2 },
      { slug: 'negra', name: 'Negra', hex: '#1A1A1A', sortOrder: 3 },
    ])
    .onConflictDoNothing();
  console.log('  tamaños y colores');

  // --- Colecciones -----------------------------------------------------
  await db
    .insert(collections)
    .values([
      {
        slug: 'para-el-oido',
        name: 'Para el oído',
        description: 'Zarcillos y earcuffs juntos, para quien busca por dónde se usa.',
        sortOrder: 1,
      },
      { slug: 'novedades', name: 'Novedades', sortOrder: 2 },
      {
        slug: 'ultimas-piezas',
        name: 'Últimas piezas',
        description: 'Lo que queda poco.',
        sortOrder: 3,
      },
      { slug: 'regalos', name: 'Regalos', sortOrder: 4 },
    ])
    .onConflictDoNothing();
  console.log('  colecciones');

  // --- Estados ---------------------------------------------------------
  await db
    .insert(states)
    .values(
      VENEZUELAN_STATES.map((name, i) => ({ slug: slugify(name), name, sortOrder: i + 1 })),
    )
    .onConflictDoNothing();
  console.log(`  ${VENEZUELAN_STATES.length} estados`);

  // --- Modalidades de entrega ------------------------------------------
  await db
    .insert(deliveryOptions)
    .values([
      {
        kind: 'point',
        slug: 'plaza-venezuela',
        name: 'Punto de encuentro — Plaza Venezuela',
        description: 'Entrega gratuita en Plaza Venezuela, coordinando día y hora.',
        feeUsd: '0',
        sortOrder: 1,
      },
      {
        kind: 'pickup',
        slug: 'pickup-san-antonio',
        name: 'Retiro — San Antonio de los Altos',
        feeUsd: '0',
        sortOrder: 2,
      },
      {
        kind: 'pickup',
        slug: 'pickup-el-valle',
        name: 'Retiro — El Valle',
        feeUsd: '0',
        sortOrder: 3,
      },
      {
        kind: 'delivery',
        slug: 'delivery-caracas',
        name: 'Delivery en Caracas',
        description: 'La tarifa depende de la zona.',
        feeUsd: '0',
        requiresAddress: true,
        requiresZone: true,
        sortOrder: 4,
      },
      {
        kind: 'national',
        slug: 'envio-nacional',
        name: 'Envío nacional',
        description: 'Flete por cobrar: el envío se paga al retirar en la agencia.',
        feeUsd: '0',
        requiresAgency: true,
        sortOrder: 5,
      },
    ])
    .onConflictDoNothing();
  console.log('  modalidades de entrega');

  console.log('\nListo.');
  console.log('Pendiente de cargar desde el panel:');
  console.log('  - tipos y modelos del resto de las categorías');
  console.log('  - zonas de delivery en Caracas con su tarifa');
  console.log('  - productos, variantes, precios, fotos y existencias');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('La semilla falló:', error);
    process.exit(1);
  });
