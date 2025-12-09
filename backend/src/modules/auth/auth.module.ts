import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { TenantResolverService } from './tenant-resolver.service';
import { AuditService } from './audit.service';

@Module({
  imports: [
    PassportModule, // Required for AuthGuard('jwt') to work
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
        console.log(`[AuthModule] JwtModule registering with secret: ${secret.substring(0, 10)}... (${secret.length} chars)`);
        return {
          secret: secret,
          signOptions: { expiresIn: '1d' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TenantResolverService,
    AuditService,
  ],
  exports: [TenantResolverService, PassportModule], // Export PassportModule so other modules can use AuthGuard
})
export class AuthModule {}
