import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /**
   * Generate PDF with Hebrew support using pdfkit
   * Note: pdfkit has limited Hebrew support. For production, consider using:
   * - pdfmake (better RTL support)
   * - puppeteer (render HTML to PDF)
   * - or embed a Hebrew font
   */
  async generatePayslipPDF(payslipData: any): Promise<Buffer> {
    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        layout: 'portrait',
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));

      // Helper to format currency
      const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('he-IL', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      };

      // Helper to format date
      const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL');
      };

      const monthNames = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
      ];

      // Try to load Hebrew font if available, otherwise use Helvetica
      // Note: pdfkit has limited Hebrew support even with custom fonts
      // For production, consider using puppeteer or pdfmake instead
      const fontPath = path.join(process.cwd(), 'backend', 'fonts', 'NotoSansHebrew-Regular.ttf');
      const altFontPath = path.join(process.cwd(), 'fonts', 'NotoSansHebrew-Regular.ttf');
      
      let fontLoaded = false;
      if (fs.existsSync(fontPath)) {
        try {
          doc.registerFont('Hebrew', fontPath);
          doc.font('Hebrew');
          fontLoaded = true;
          this.logger.log('Using Hebrew font for PDF generation');
        } catch (error) {
          this.logger.warn('Failed to load Hebrew font from backend/fonts');
        }
      }
      
      if (!fontLoaded && fs.existsSync(altFontPath)) {
        try {
          doc.registerFont('Hebrew', altFontPath);
          doc.font('Hebrew');
          fontLoaded = true;
          this.logger.log('Using Hebrew font from fonts directory');
        } catch (error) {
          this.logger.warn('Failed to load Hebrew font from fonts directory');
        }
      }
      
      if (!fontLoaded) {
        doc.font('Helvetica');
        this.logger.warn('Hebrew font not found, using Helvetica (Hebrew text may display as gibberish)');
        this.logger.warn('To fix: Download Noto Sans Hebrew font to backend/fonts/NotoSansHebrew-Regular.ttf');
      }

      // Header
      doc.fontSize(24).fillColor('black');
      const title = `תלוש שכר – ${monthNames[payslipData.payslip.month - 1]} ${payslipData.payslip.year}`;
      doc.text(title, 50, 50, { 
        width: 500, 
        align: 'right'
      });

      doc.fontSize(14).fillColor('gray');
      const companyInfo = `${payslipData.company.name} | ח.פ. ${payslipData.company.registration_number}`;
      doc.text(companyInfo, 50, 80, { width: 500, align: 'right' });
      
      doc.moveDown(2);
      doc.fillColor('black');

      // Employee Details Section
      doc.fontSize(16).text('פרטי עובד', 50, doc.y, { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(11);
      
      const employeeDetails = [
        `שם מלא: ${payslipData.employee.full_name}`,
        `מספר עובד: ${payslipData.employee.employee_id}`,
        `תעודת זהות: ${payslipData.employee.national_id}`,
        `כתובת: ${payslipData.employee.address || 'לא צוין'}`,
        `תאריך תחילת עבודה: ${formatDate(payslipData.employee.employment_start_date)}`,
        `ותק: ${payslipData.employee.seniority_years} שנים`,
        `אחוז משרה: ${payslipData.employee.job_percentage}%`,
        `מחלקה: ${payslipData.employee.department || 'לא צוין'}`,
        `מרכז עבודה: ${payslipData.employee.work_center || 'לא צוין'}`,
        `תפקיד: ${payslipData.employee.position || 'לא צוין'}`,
        `דרגה: ${payslipData.employee.grade || 'לא צוין'}`,
        `מצב משפחתי: ${payslipData.employee.marital_status || 'לא צוין'}`,
        `בנק: ${payslipData.employee.bank_name || 'לא צוין'}`,
        `סניף: ${payslipData.employee.branch_number || 'לא צוין'}`,
        `חשבון: ${payslipData.employee.account_number || 'לא צוין'}`,
      ];

      employeeDetails.forEach((detail) => {
        doc.text(detail, 50, doc.y, { width: 500, align: 'right' });
      });

      doc.moveDown(1.5);

      // Earnings Table
      doc.fontSize(16).text('תשלומים', 50, doc.y, { align: 'right' });
      doc.moveDown(0.5);
      
      let tableY = doc.y;
      const colWidths = { code: 60, desc: 200, qty: 60, rate: 80, taxable: 80, amount: 80 };
      const startX = 50;
      const rightEdge = 550;

      // Table header
      doc.fontSize(10).fillColor('gray');
      doc.text('קוד', rightEdge - colWidths.code, tableY);
      doc.text('תיאור', rightEdge - colWidths.code - colWidths.desc, tableY);
      doc.text('כמות', rightEdge - colWidths.code - colWidths.desc - colWidths.qty, tableY);
      doc.text('תעריף', rightEdge - colWidths.code - colWidths.desc - colWidths.qty - colWidths.rate, tableY);
      doc.text('ערך חייב במס', rightEdge - colWidths.code - colWidths.desc - colWidths.qty - colWidths.rate - colWidths.taxable, tableY);
      doc.text('סכום', rightEdge - colWidths.code - colWidths.desc - colWidths.qty - colWidths.rate - colWidths.taxable - colWidths.amount, tableY);

      // Draw header line
      doc.moveTo(startX, tableY + 15).lineTo(rightEdge, tableY + 15).stroke();
      
      doc.fontSize(9).fillColor('black');
      payslipData.earnings.forEach((earning: any, index: number) => {
        const rowY = tableY + 25 + (index * 20);
        doc.text(earning.code || '', rightEdge - colWidths.code, rowY);
        doc.text(earning.description || '', rightEdge - colWidths.code - colWidths.desc, rowY, { width: colWidths.desc });
        doc.text(earning.quantity?.toString() || '0', rightEdge - colWidths.code - colWidths.desc - colWidths.qty, rowY);
        doc.text(formatCurrency(earning.rate || 0), rightEdge - colWidths.code - colWidths.desc - colWidths.qty - colWidths.rate, rowY);
        doc.text(formatCurrency(earning.taxable_value || 0), rightEdge - colWidths.code - colWidths.desc - colWidths.qty - colWidths.rate - colWidths.taxable, rowY);
        doc.text(formatCurrency(earning.amount || 0), rightEdge - colWidths.code - colWidths.desc - colWidths.qty - colWidths.rate - colWidths.taxable - colWidths.amount, rowY);
      });

      // Total earnings
      const totalEarningsY = tableY + 25 + (payslipData.earnings.length * 20) + 10;
      doc.moveTo(startX, totalEarningsY - 5).lineTo(rightEdge, totalEarningsY - 5).stroke();
      doc.fontSize(11).fillColor('black');
      doc.text('סה״כ תשלומים:', rightEdge - colWidths.code - colWidths.desc - colWidths.qty - colWidths.rate - colWidths.taxable - colWidths.amount, totalEarningsY);
      doc.text(formatCurrency(payslipData.totals.total_earnings || 0), rightEdge - colWidths.code - colWidths.desc - colWidths.qty - colWidths.rate - colWidths.taxable - colWidths.amount, totalEarningsY, { align: 'right' });

      doc.moveDown(2);

      // Deductions Table
      doc.fontSize(16).text('ניכויים', 50, doc.y, { align: 'right' });
      doc.moveDown(0.5);
      
      tableY = doc.y;
      const dedColWidths = { desc: 400, amount: 100 };

      // Table header
      doc.fontSize(10).fillColor('gray');
      doc.text('תיאור', rightEdge - dedColWidths.amount, tableY);
      doc.text('סכום', rightEdge - dedColWidths.amount - dedColWidths.desc, tableY);

      // Draw header line
      doc.moveTo(startX, tableY + 15).lineTo(rightEdge, tableY + 15).stroke();
      
      doc.fontSize(9).fillColor('black');
      payslipData.deductions.forEach((deduction: any, index: number) => {
        const rowY = tableY + 25 + (index * 20);
        doc.text(deduction.description || '', rightEdge - dedColWidths.amount - dedColWidths.desc, rowY, { width: dedColWidths.desc });
        doc.text(formatCurrency(deduction.amount || 0), rightEdge - dedColWidths.amount, rowY);
      });

      // Total deductions
      const totalDeductionsY = tableY + 25 + (payslipData.deductions.length * 20) + 10;
      doc.moveTo(startX, totalDeductionsY - 5).lineTo(rightEdge, totalDeductionsY - 5).stroke();
      doc.fontSize(11).fillColor('black');
      doc.text('סה״כ ניכויים:', rightEdge - dedColWidths.amount - dedColWidths.desc, totalDeductionsY);
      doc.text(formatCurrency(payslipData.totals.total_deductions || 0), rightEdge - dedColWidths.amount, totalDeductionsY, { align: 'right' });

      doc.moveDown(2);

      // Net Salary - Highlighted
      doc.fontSize(20).fillColor('black');
      const netSalaryText = `שכר נטו: ₪${formatCurrency(payslipData.totals.net_salary || 0)}`;
      doc.text(netSalaryText, 50, doc.y, { width: 500, align: 'right' });

      doc.moveDown(1.5);

      // Summary Cards
      doc.fontSize(12).fillColor('black');
      doc.text('סיכום', 50, doc.y, { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(10);
      
      const summaryItems = [
        `שכר חייב במס: ₪${formatCurrency(payslipData.totals.taxable_salary || 0)}`,
        `שכר מבוטח: ₪${formatCurrency(payslipData.totals.insured_salary || 0)}`,
        `אחוז מס: ${(payslipData.totals.tax_percentage || 0).toFixed(2)}%`,
        `נקודות זיכוי: ${payslipData.totals.credit_points || 0}`,
        `ימי עבודה: ${payslipData.attendance.work_days || 0}`,
        `שעות עבודה: ${payslipData.attendance.work_hours || 0}`,
        `ימי היעדרות: ${payslipData.attendance.absence_days || 0}`,
      ];

      summaryItems.forEach((item) => {
        doc.text(item, 50, doc.y, { width: 500, align: 'right' });
      });

      doc.moveDown(1.5);

      // Vacation & Sick Balances
      doc.fontSize(12).text('יתרות חופשה ומחלה', 50, doc.y, { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(10);
      
      const balances = [
        `חופשה - יתרה קודמת: ${payslipData.balances.vacation.previous_balance || 0}`,
        `חופשה - נצבר: ${payslipData.balances.vacation.accrued || 0}`,
        `חופשה - נוצל: ${payslipData.balances.vacation.used || 0}`,
        `חופשה - יתרה חדשה: ${payslipData.balances.vacation.new_balance || 0}`,
        `מחלה - יתרה קודמת: ${payslipData.balances.sick.previous_balance || 0}`,
        `מחלה - נצבר: ${payslipData.balances.sick.accrued || 0}`,
        `מחלה - נוצל: ${payslipData.balances.sick.used || 0}`,
        `מחלה - יתרה חדשה: ${payslipData.balances.sick.new_balance || 0}`,
      ];

      balances.forEach((balance) => {
        doc.text(balance, 50, doc.y, { width: 500, align: 'right' });
      });

      doc.moveDown(2);

      // Footer
      doc.fontSize(9).fillColor('gray');
      doc.text(`תאריך יצירה: ${formatDate(payslipData.payslip.generation_date)}`, 50, doc.y, { width: 500, align: 'right' });
      doc.text(`מספר תלוש: ${payslipData.payslip.id}`, 50, doc.y, { width: 500, align: 'right' });
      doc.text(`גרסה: ${payslipData.payslip.version}`, 50, doc.y, { width: 500, align: 'right' });
      doc.text('נוצר על ידי PayLens', 50, doc.y, { width: 500, align: 'right' });

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });
    } catch (error: any) {
      this.logger.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }
}
