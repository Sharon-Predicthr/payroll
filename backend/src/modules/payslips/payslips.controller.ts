import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request, Res, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantConnectionGuard } from '../../common/guards/tenant-connection.guard';
import { PayslipsService } from './payslips.service';
import { CreatePayslipDto } from './dto/create-payslip.dto';
import { ProcessPayrollDto } from './dto/process-payroll.dto';
import { Response } from 'express';

@Controller('payslips')
@UseGuards(AuthGuard('jwt'), TenantConnectionGuard)
export class PayslipsController {
  private readonly logger = new Logger(PayslipsController.name);

  constructor(private payslipsService: PayslipsService) {}

  @Get('latest/:employeeId')
  async getLatestPayslip(@Param('employeeId') employeeId: string, @Request() req: any) {
    try {
      const tenantId = req.user.tenant_id;
      const tenantCode = req.tenantCode;
      const userId = req.user.user_id;
      const userRole = req.user.role;

      const payslip = await this.payslipsService.getLatestPayslipForEmployee(
        employeeId,
        tenantId,
        tenantCode,
        userId,
        userRole,
      );

      if (!payslip) {
        return {
          success: false,
          data: null,
          message: 'No payslip found for this employee',
        };
      }

      return {
        success: true,
        data: payslip,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get latest payslip for employee ${employeeId}:`, error);
      throw error;
    }
  }

  @Get(':id')
  async getPayslip(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.user.tenant_id;
      const tenantCode = req.tenantCode;
      const userId = req.user.user_id;
      const userRole = req.user.role;

      const payslip = await this.payslipsService.getPayslip(
        id,
        tenantId,
        tenantCode,
        userId,
        userRole,
      );

      return {
        success: true,
        data: payslip,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get payslip ${id}:`, error);
      throw error;
    }
  }

  @Post()
  async createPayslip(@Body() dto: CreatePayslipDto, @Request() req: any) {
    try {
      const tenantId = req.user.tenant_id;
      const tenantCode = req.tenantCode;

      const payslipId = await this.payslipsService.createPayslip(
        dto,
        tenantId,
        tenantCode,
      );

      return {
        success: true,
        data: { id: payslipId },
        message: 'Payslip created successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to create payslip:', error);
      throw error;
    }
  }

  @Get()
  async listPayslips(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const tenantId = req.user.tenant_id;
      const tenantCode = req.tenantCode;
      const userId = req.user.user_id;
      const userRole = req.user.role;
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;

      const result = await this.payslipsService.listPayslips(
        tenantId,
        tenantCode,
        userId,
        userRole,
        pageNum,
        limitNum,
      );

      return {
        success: true,
        data: result.payslips,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to list payslips:', error);
      throw error;
    }
  }

  @Post(':id/pdf')
  async generatePDF(
    @Param('id') id: string,
    @Request() req: any,
    @Res({ passthrough: false }) res: Response,
  ) {
    try {
      this.logger.log(`[generatePDF] Generating PDF for payslip ${id}`);
      const tenantId = req.user.tenant_id;
      const tenantCode = req.tenantCode;
      const userId = req.user.user_id;
      const userRole = req.user.role;

      this.logger.log(`[generatePDF] Tenant: ${tenantCode}, User: ${userId}, Role: ${userRole}`);

      // Get payslip data first to generate filename
      const payslipData = await this.payslipsService.getPayslip(id, tenantId, tenantCode, userId, userRole);
      
      // Generate friendly filename with employee name and month
      const monthNames = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
      ];
      
      const employeeName = payslipData.employee.full_name || 'עובד';
      const month = monthNames[payslipData.payslip.month - 1] || 'חודש';
      const year = payslipData.payslip.year;
      
      const pdfBuffer = await this.payslipsService.generatePDF(
        id,
        tenantId,
        tenantCode,
        userId,
        userRole,
      );

      if (!pdfBuffer || pdfBuffer.length === 0) {
        this.logger.error(`[generatePDF] PDF buffer is empty for payslip ${id}`);
        res.status(500).json({
          success: false,
          message: 'PDF generation failed: empty buffer',
        });
        return;
      }

      this.logger.log(`[generatePDF] PDF generated successfully, size: ${pdfBuffer.length} bytes`);

      // Create filename: "שרון - תלוש דצמבר.pdf"
      const filename = `${employeeName} - תלוש ${month} ${year}.pdf`;
      
      // Encode filename for HTTP header using RFC 5987 format
      // Format: filename="fallback"; filename*=UTF-8''encoded
      const safeFilename = `payslip-${id}.pdf`; // ASCII fallback for older browsers
      
      // RFC 5987 encoding: percent-encode UTF-8 bytes directly
      // Convert string to UTF-8 bytes, then percent-encode each byte
      const utf8Bytes = Buffer.from(filename, 'utf8');
      const rfc5987Filename = Array.from(utf8Bytes)
        .map(byte => '%' + byte.toString(16).toUpperCase().padStart(2, '0'))
        .join('');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${rfc5987Filename}`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);
      // Don't return anything when using @Res() - response is sent directly
    } catch (error: any) {
      this.logger.error(`[generatePDF] Failed to generate PDF for payslip ${id}:`, error);
      this.logger.error(`[generatePDF] Error stack:`, error.stack);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to generate PDF',
        });
      }
    }
  }

  @Get('template/preference')
  async getTemplatePreference(@Request() req: any) {
    try {
      const tenantCode = req.tenantCode;
      this.logger.log(`[getTemplatePreference] Getting template preference for tenant: ${tenantCode}`);
      const result = await this.payslipsService.getPayslipTemplatePreferenceForCompany(tenantCode);
      this.logger.log(`[getTemplatePreference] Result: ${JSON.stringify(result)}`);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error('[getTemplatePreference] Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get template preference',
      };
    }
  }

  @Put('template/preference')
  async updateTemplatePreference(@Body() body: { template: 'template1' | 'template2' }, @Request() req: any) {
    try {
      const tenantCode = req.tenantCode;
      const userRole = req.user.role;

      // Only PAYROLL_MANAGER can update template preference
      if (userRole !== 'PAYROLL_MANAGER') {
        return {
          success: false,
          message: 'Only payroll managers can update template preference',
        };
      }

      if (!body.template || !['template1', 'template2'].includes(body.template)) {
        return {
          success: false,
          message: 'Invalid template. Must be template1 or template2',
        };
      }

      const result = await this.payslipsService.updatePayslipTemplatePreference(tenantCode, body.template);
      return {
        success: result.success,
        message: result.message,
      };
    } catch (error: any) {
      this.logger.error('[updateTemplatePreference] Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update template preference',
      };
    }
  }

  @Post('process')
  async processPayroll(@Body() dto: ProcessPayrollDto, @Request() req: any) {
    try {
      const tenantId = req.user.tenant_id;
      const tenantCode = req.tenantCode;

      const result = await this.payslipsService.processPayroll(
        dto,
        tenantId,
        tenantCode,
      );

      return {
        success: true,
        data: result,
        message: `Processed ${result.processed} employees${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
      };
    } catch (error: any) {
      this.logger.error('Failed to process payroll:', error);
      throw error;
    }
  }
}

