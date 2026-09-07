import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ORPCError } from '@orpc/nest';
import type { AdminRole } from '@vibra/contracts';
import type { Request } from 'express';
import { AuthService, type AccessTokenPayload } from './auth.service.js';
import { ACCESS_COOKIE } from './cookies.js';
import { ROLES_KEY } from './roles.decorator.js';

/** La petición queda anotada con el administrador autenticado. */
export interface RequestWithAdmin extends Request {
  admin?: AccessTokenPayload;
}

/**
 * Exige sesión de panel válida y, si la ruta lo declara con `@Roles`, el rol
 * correspondiente.
 *
 * Verifica el token sin consultar la base: como dura quince minutos, una
 * cuenta desactivada deja de entrar en el próximo refresco, que sí consulta.
 * Es el compromiso que evita pagar una consulta por cada petición del panel.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const token = request.cookies?.[ACCESS_COOKIE] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Hace falta iniciar sesión.');
    }

    // El servicio lanza ORPCError porque lo usan los handlers del contrato,
    // pero un guard corre fuera del interceptor de oRPC: si saliera de aquí
    // sin convertir, Nest lo trataría como error no controlado y devolvería
    // 500 en vez de 401.
    let payload: AccessTokenPayload;
    try {
      payload = await this.auth.verifyAccessToken(token);
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof ORPCError ? error.message : 'Sesión inválida o expirada.',
      );
    }

    request.admin = payload;

    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required?.length && !required.includes(payload.role)) {
      throw new ForbiddenException('Tu rol no permite esta acción.');
    }

    return true;
  }
}
