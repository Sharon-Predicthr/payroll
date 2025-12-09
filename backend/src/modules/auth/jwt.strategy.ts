import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
    this.logger.log(`JWT Strategy initialized with secret: ${secret.substring(0, 10)}...`);
    this.logger.log(`JWT Strategy secret length: ${secret.length}`);
  }

  async validate(payload: any) {
    try {
      this.logger.log(`[JWT Strategy] validate() called`);
      this.logger.log(`[JWT Strategy] Payload received: ${JSON.stringify(payload)}`);
      
      if (!payload) {
        this.logger.error('[JWT Strategy] Payload is null or undefined');
        throw new UnauthorizedException('Invalid token payload');
      }

      if (!payload.tenantCode) {
        this.logger.error('[JWT Strategy] Payload missing tenantCode');
        this.logger.error(`[JWT Strategy] Payload keys: ${Object.keys(payload).join(', ')}`);
        throw new UnauthorizedException('Token missing tenant code');
      }

      this.logger.log(`[JWT Strategy] Validation successful for tenant: ${payload.tenantCode}`);
      return payload; // returns {sub, email, tenantCode, role}
    } catch (error) {
      this.logger.error(`[JWT Strategy] Validation error: ${error.message}`);
      this.logger.error(`[JWT Strategy] Error stack: ${error.stack}`);
      throw error;
    }
  }
}

