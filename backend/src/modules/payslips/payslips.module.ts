import { Module } from '@nestjs/common';
import { PayslipsController } from './payslips.controller';
import { PayslipsService } from './payslips.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { PdfGeneratorHtmlService } from './pdf-generator-html.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PayslipsController],
  providers: [PayslipsService, PdfGeneratorService, PdfGeneratorHtmlService],
  exports: [PayslipsService],
})
export class PayslipsModule {}

