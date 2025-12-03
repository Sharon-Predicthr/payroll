import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make config available everywhere
      envFilePath: '.env', // Load .env file from backend folder
    }),
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
