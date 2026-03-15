import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET') || 'fallback_secret',
    });
  }

  async validate(payload: any) {
    // Legacy tokens issued before roles were embedded won't have payload.roles.
    // Fall back to a DB lookup so old sessions keep working without forcing re-login.
    const roles: string[] =
      payload.roles ??
      (await this.usersService.findById(payload.sub))?.roles ??
      [];
    return { userId: payload.sub, email: payload.email, roles };
  }
}