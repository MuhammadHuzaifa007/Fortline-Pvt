import {
  getCurrentAccount,
  UnauthorizedError,
  ForbiddenError,
  toErrorResponse,
  type AccountContext,
} from './account';

/**
 * Ensures the request is authenticated and authorized as the CEO/Owner.
 */
export async function requireCeo(): Promise<AccountContext> {
  const ctx = await getCurrentAccount();
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    throw new ForbiddenError('CEO / Owner access required');
  }
  return ctx;
}

export { toErrorResponse, UnauthorizedError, ForbiddenError };
