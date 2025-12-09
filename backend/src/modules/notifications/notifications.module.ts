import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule to get TenantResolverService

@Module({
  imports: [AuthModule], // Import AuthModule to use TenantResolverService
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // Export so other modules can use it
})
export class NotificationsModule {}

