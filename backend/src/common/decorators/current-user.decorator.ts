import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  name: string;
  scope?: 'app' | 'admin';
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | 'id' | undefined,
    context: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    if (!data) {
      return user;
    }

    // Keep compatibility with places that use @CurrentUser('id')
    if (data === 'id') {
      return user.sub;
    }

    return user[data];
  },
);
