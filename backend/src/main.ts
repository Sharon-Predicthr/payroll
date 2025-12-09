import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TenantDbIndicatorInterceptor } from './common/interceptors/tenant-db-indicator.interceptor';
import { TenantResolverService } from './modules/auth/tenant-resolver.service';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS with proper configuration (permissive for development)
    app.enableCors({
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-DB-Host', 'X-Tenant-DB-Name', 'X-Tenant-Code'],
      exposedHeaders: ['X-Tenant-DB-Host', 'X-Tenant-DB-Name', 'X-Tenant-Code'],
    });

    // Log JWT secret on startup (first 10 chars only for security)
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    console.log(`🔐 JWT Secret: ${jwtSecret.substring(0, 10)}... (${jwtSecret.length} chars)`);

    // Add tenant DB indicator interceptor globally if enabled
    if (process.env.ENABLE_DB_INDICATOR === 'true') {
      const tenantResolver = app.get(TenantResolverService);
      app.useGlobalInterceptors(new TenantDbIndicatorInterceptor(tenantResolver));
      console.log('⚠️  DB Indicator enabled - tenant DB info will be shown in responses');
      console.log('   Set ENABLE_DB_INDICATOR=false to disable');
    }
    
    // Add request logging middleware
    app.use((req: any, res: any, next: any) => {
      if (req.path.startsWith('/employees') || req.path.startsWith('/org') || req.path === '/') {
        console.log(`[Request] ${req.method} ${req.path}`);
        console.log(`[Request] Original URL: ${req.originalUrl}`);
        console.log(`[Request] Base URL: ${req.baseUrl}`);
        console.log(`[Request] Authorization header: ${req.headers.authorization ? 'Present' : 'Missing'}`);
        if (req.headers.authorization) {
          const token = req.headers.authorization.replace('Bearer ', '');
          console.log(`[Request] Token (first 20 chars): ${token.substring(0, 20)}...`);
          
          // Try to decode token to see what's in it (without verification)
          try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(token, { complete: true });
            if (decoded) {
              console.log(`[Request] Token payload:`, JSON.stringify(decoded.payload, null, 2));
              console.log(`[Request] Token expires at:`, new Date(decoded.payload.exp * 1000).toISOString());
              console.log(`[Request] Current time:`, new Date().toISOString());
              console.log(`[Request] Token expired:`, decoded.payload.exp * 1000 < Date.now());
              
              // Try to verify with current secret
              const currentSecret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
              try {
                jwt.verify(token, currentSecret);
                console.log(`[Request] ✅ Token verification with current secret: SUCCESS`);
              } catch (verifyError: any) {
                console.log(`[Request] ❌ Token verification with current secret: FAILED`);
                console.log(`[Request] Verification error:`, verifyError.message);
                console.log(`[Request] Current secret (first 10 chars): ${currentSecret.substring(0, 10)}...`);
                console.log(`[Request] Current secret length: ${currentSecret.length}`);
              }
            }
          } catch (e) {
            console.log(`[Request] Could not decode token:`, e.message);
          }
        }
      }
      next();
    });
    
    await app.listen(4000);
    console.log("Backend running on http://localhost:4000");
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

bootstrap();
