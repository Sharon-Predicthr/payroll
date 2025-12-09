import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.login(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req: Request) {
    // Extract user email from JWT payload (set by JwtStrategy)
    const user = req.user;
    return this.authService.logout(user?.email || 'unknown', {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
  }
}

