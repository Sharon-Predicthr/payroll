import { Module } from '@nestjs/common';
import { PayslipsController } from './payslips.controller';
import { PayslipsService } from './payslips.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { PdfGeneratorHtmlService } from './pdf-generator-html.service';
import { PdfGeneratorHtmlTemplate2Service } from './pdf-generator-html-template2.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PayslipsController],
  providers: [PayslipsService, PdfGeneratorService, PdfGeneratorHtmlService, PdfGeneratorHtmlTemplate2Service],
  exports: [PayslipsService],
})
export class PayslipsModule {}

