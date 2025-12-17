import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { PayslipsModule } from './modules/payslips/payslips.module';
import { LookupModule } from './modules/lookup/lookup.module';
import { PayrollPeriodsModule } from './modules/payroll-periods/payroll-periods.module';
import { TenantDbLoggerMiddleware } from './common/middleware/tenant-db-logger.middleware';
import { SmartRouterMiddleware } from './router/smart-router.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make config available everywhere
      envFilePath: '.env', // Load .env file from backend folder
    }),
    ScheduleModule.forRoot(), // Enable job scheduler
    AuthModule,
    EmployeesModule,
    NotificationsModule,
    JobsModule, // Add Jobs module
    OrganizationModule, // Add Organization module
    PayslipsModule, // Add Payslips module
    LookupModule, // Add Lookup module
    PayrollPeriodsModule, // Add Payroll Periods module
  ],
  controllers: [],
  providers: [SmartRouterMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply Smart Router Middleware first (determines Control vs Tenant DB)
    consumer
      .apply(SmartRouterMiddleware)
      .forRoutes('*');

    // Add tenant DB logger middleware if indicator is enabled (after smart router)
    if (process.env.ENABLE_DB_INDICATOR === 'true') {
      consumer
        .apply(TenantDbLoggerMiddleware)
        .forRoutes('*'); // Apply to all routes
    }
  }
}
