import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ORPCError } from '@orpc/nest';
import { hash, verify } from '@node-rs/argon2';
import type { AdminUserPublic } from '@vibra/contracts';
import { schema, type Database } from '@vibra/db';
import { eq } from 'drizzle-orm';
import type { Env } from '../config/env.js';
import { DB } from '../db/db.module.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Contenido del token de acceso. Se confía sin consultar la base. */
export interface AccessTokenPayload {
  sub: number;
  email: string;
  role: AdminUserPublic['role'];
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Valida credenciales.
   *
   * Cuando el correo no existe igual se hace una verificación contra un
   * hash de descarte, para que el tiempo de respuesta no revele si la
   * cuenta existe.
   */
  async validate(email: string, password: string): Promise<AdminUserPublic> {
    const [user] = await this.db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !user.isActive) {
      await verify(DUMMY_HASH, password).catch(() => false);
      throw new ORPCError('UNAUTHORIZED', { message: 'Correo o contraseña incorrectos.' });
    }

    const ok = await verify(user.passwordHash, password).catch(() => false);
    if (!ok) {
      throw new ORPCError('UNAUTHORIZED', { message: 'Correo o contraseña incorrectos.' });
    }

    await this.db
      .update(schema.adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.adminUsers.id, user.id));

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async issueTokens(user: AdminUserPublic): Promise<TokenPair> {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      }),
      this.jwt.signAsync(
        { sub: user.id, type: 'refresh' },
        { expiresIn: this.config.get('JWT_REFRESH_TTL', { infer: true }) },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Renueva la sesión.
   *
   * A diferencia del token de acceso, aquí sí se consulta la base: es el
   * momento en que una cuenta desactivada deja de poder seguir entrando,
   * sin pagar una consulta en cada petición.
   */
  async refresh(refreshToken: string): Promise<{ user: AdminUserPublic; tokens: TokenPair }> {
    let sub: number;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; type?: string }>(refreshToken);
      if (payload.type !== 'refresh') throw new Error('Tipo de token incorrecto');
      sub = payload.sub;
    } catch {
      throw new ORPCError('UNAUTHORIZED', { message: 'La sesión expiró. Vuelve a entrar.' });
    }

    const [user] = await this.db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, sub))
      .limit(1);

    if (!user || !user.isActive) {
      throw new ORPCError('UNAUTHORIZED', { message: 'La cuenta ya no está activa.' });
    }

    const publicUser: AdminUserPublic = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return { user: publicUser, tokens: await this.issueTokens(publicUser) };
  }

  /** Datos públicos de un administrador activo, o null si no aplica. */
  async findById(id: number): Promise<AdminUserPublic | null> {
    const [user] = await this.db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, id))
      .limit(1);

    if (!user || !user.isActive) return null;

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new ORPCError('UNAUTHORIZED', { message: 'Sesión inválida o expirada.' });
    }
  }

  /** Parámetros de argon2id recomendados para contraseñas interactivas. */
  static hashPassword(password: string): Promise<string> {
    return hash(password, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  }
}

/**
 * Hash de descarte para igualar el tiempo de respuesta cuando el correo no
 * existe. Corresponde a una contraseña aleatoria que nadie conoce.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZXg$Zm9vYmFyYmF6cXV4Y29ycmVjdGhvcnNlYmF0dGVy';
