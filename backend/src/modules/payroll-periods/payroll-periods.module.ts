import { Module } from '@nestjs/common';
import { PayrollPeriodsController } from './payroll-periods.controller';
import { PayrollPeriodsService } from './payroll-periods.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PayrollPeriodsController],
  providers: [PayrollPeriodsService],
  exports: [PayrollPeriodsService],
})
export class PayrollPeriodsModule {}

