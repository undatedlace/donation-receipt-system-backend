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

  async register(firstName: string, lastName: string, email: string, password: string, roles: string[], zone?: string, branch?: string, phone?: string) {
    const user = await this.usersService.create(firstName, lastName, email, password, roles, zone, branch, phone);
    const token = this.jwtService.sign({ sub: user._id, email: user.email, roles: user.roles });
    return {
      token,
      user: { id: user._id, name: `${user.firstName} ${user.lastName}`, email: user.email, roles: user.roles, phone: user.phone },
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Keep plainPassword in sync so admin can view it in the Team screen
    await this.usersService.updatePlainPassword(String(user._id), password);

    const token = this.jwtService.sign({ sub: user._id, email: user.email, roles: user.roles });
    return {
      token,
      user: { id: user._id, name: `${user.firstName} ${user.lastName}`, email: user.email, roles: user.roles },
    };
  }
}