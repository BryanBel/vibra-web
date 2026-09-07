import { SetMetadata } from '@nestjs/common';
import type { AdminRole } from '@vibra/contracts';

export const ROLES_KEY = 'vibra:roles';

/**
 * Restringe una ruta a ciertos roles.
 *
 *   @Roles('owner')
 *   @Implement(contract.admin.borrarProducto)
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
