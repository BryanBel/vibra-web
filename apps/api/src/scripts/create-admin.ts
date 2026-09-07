/**
 * Crea o actualiza un usuario del panel.
 *
 * La contraseña se pasa por variable de entorno y no como argumento, para
 * que no quede en el historial del shell ni en la lista de procesos:
 *
 *   ADMIN_EMAIL=gillary@vibra.com ADMIN_NAME="Gillary Mass" \
 *   ADMIN_PASSWORD='...' ADMIN_ROLE=owner \
 *   pnpm --filter @vibra/api create-admin
 *
 * Si el correo ya existe, actualiza la contraseña y el rol.
 */
import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { ADMIN_ROLES, type AdminRole } from '@vibra/contracts';
import { createDb, schema } from '@vibra/db';
import { eq } from 'drizzle-orm';

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD, ADMIN_ROLE } = process.env;

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!DATABASE_URL) fail('Falta DATABASE_URL.');
if (!ADMIN_EMAIL) fail('Falta ADMIN_EMAIL.');
if (!ADMIN_NAME) fail('Falta ADMIN_NAME.');
if (!ADMIN_PASSWORD) fail('Falta ADMIN_PASSWORD.');

if (ADMIN_PASSWORD.length < 12) {
  fail('La contraseña debe tener al menos 12 caracteres.');
}

const role: AdminRole = (ADMIN_ROLE as AdminRole) ?? 'owner';
if (!ADMIN_ROLES.includes(role)) {
  fail(`ADMIN_ROLE debe ser uno de: ${ADMIN_ROLES.join(', ')}`);
}

const email = ADMIN_EMAIL.toLowerCase().trim();

async function main() {
  const db = createDb(DATABASE_URL!, { max: 1 });
  const passwordHash = await hash(ADMIN_PASSWORD!, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const [existing] = await db
    .select({ id: schema.adminUsers.id })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email))
    .limit(1);

  if (existing) {
    await db
      .update(schema.adminUsers)
      .set({ passwordHash, name: ADMIN_NAME!, role, isActive: true, updatedAt: new Date() })
      .where(eq(schema.adminUsers.id, existing.id));
    console.log(`\n  Actualizado: ${email} (${role})\n`);
  } else {
    await db
      .insert(schema.adminUsers)
      .values({ email, passwordHash, name: ADMIN_NAME!, role });
    console.log(`\n  Creado: ${email} (${role})\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Falló:', error);
    process.exit(1);
  });
