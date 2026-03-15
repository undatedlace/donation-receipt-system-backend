import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(firstName: string, lastName: string, email: string, password: string, roles: string[]) {
    const user = await this.usersService.create(firstName, lastName, email, password, roles);
    const token = this.jwtService.sign({ sub: user._id, email: user.email, roles: user.roles });
    return {
      token,
      user: { id: user._id, name: `${user.firstName} ${user.lastName}`, email: user.email, roles: user.roles },
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ sub: user._id, email: user.email, roles: user.roles });
    return {
      token,
      user: { id: user._id, name: `${user.firstName} ${user.lastName}`, email: user.email, roles: user.roles },
    };
  }
}