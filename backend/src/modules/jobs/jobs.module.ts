import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsRunnerService } from './jobs.runner.service';
import { JobsRecurrenceService } from './jobs-recurrence.service';
import { JobsController } from './jobs.controller';
import { AuthModule } from '../auth/auth.module'; // For TenantResolverService
import { NotificationsModule } from '../notifications/notifications.module'; // For NotificationsService

@Module({
  imports: [
    AuthModule, // Provides TenantResolverService
    NotificationsModule, // Provides NotificationsService
  ],
  controllers: [JobsController],
  providers: [JobsService, JobsRecurrenceService, JobsRunnerService],
  exports: [JobsService], // Export if other modules need to create jobs programmatically
})
export class JobsModule {}

