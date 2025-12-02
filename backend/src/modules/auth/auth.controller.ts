import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';

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
}

