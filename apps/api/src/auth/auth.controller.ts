import { Controller, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Implement, implement } from '@orpc/nest';
import { contract } from '@vibra/contracts';
import type { Response } from 'express';
import type { Env } from '../config/env.js';
import { AdminGuard, type RequestWithAdmin } from './admin.guard.js';
import { AuthService } from './auth.service.js';
import { REFRESH_COOKIE, clearSessionCookies, setSessionCookies } from './cookies.js';

/**
 * Sesión del panel.
 *
 * Los decoradores de parámetro de Nest conviven con `@Implement`: el método
 * externo recibe la petición y la respuesta, y el handler de oRPC las toma
 * por closure. Es lo que permite emitir cookies httpOnly sin salirse del
 * contrato.
 */
@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Implement(contract.auth.login)
  login(@Res({ passthrough: true }) res: Response) {
    return implement(contract.auth.login).handler(async ({ input }) => {
      const user = await this.auth.validate(input.email, input.password);
      const tokens = await this.auth.issueTokens(user);
      setSessionCookies(res, tokens, this.isProduction);
      return { user };
    });
  }

  @Implement(contract.auth.refresh)
  refresh(@Req() req: RequestWithAdmin, @Res({ passthrough: true }) res: Response) {
    return implement(contract.auth.refresh).handler(async () => {
      const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;

      if (!token) {
        throw new UnauthorizedException('No hay sesión que renovar.');
      }

      const { user, tokens } = await this.auth.refresh(token);
      setSessionCookies(res, tokens, this.isProduction);
      return { user };
    });
  }

  @Implement(contract.auth.logout)
  logout(@Res({ passthrough: true }) res: Response) {
    return implement(contract.auth.logout).handler(async () => {
      clearSessionCookies(res, this.isProduction);
      return { ok: true as const };
    });
  }

  @UseGuards(AdminGuard)
  @Implement(contract.auth.me)
  me(@Req() req: RequestWithAdmin) {
    return implement(contract.auth.me).handler(async () => {
      const admin = req.admin;

      if (!admin) {
        throw new UnauthorizedException('Hace falta iniciar sesión.');
      }

      const user = await this.auth.findById(admin.sub);

      if (!user) {
        throw new UnauthorizedException('La cuenta ya no existe.');
      }

      return { user };
    });
  }
}
