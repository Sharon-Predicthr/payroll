import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PdfGeneratorHtmlService {
  private readonly logger = new Logger(PdfGeneratorHtmlService.name);

  /**
   * Generate HTML template for payslip (RTL, Hebrew support)
   */
  private generatePayslipHTML(payslipData: any): string {
    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('he-IL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL');
    };

    const month = monthNames[payslipData.payslip.month - 1] || 'חודש';
    const year = payslipData.payslip.year;

    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>תלוש שכר – ${month} ${year}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica', 'Segoe UI', 'Tahoma', 'David', 'Guttman Yad', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #000;
      direction: rtl;
      background: #fff;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .header {
      text-align: right;
      margin-bottom: 30px;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 15px;
      background: linear-gradient(to left, #f0f8ff, #fff);
      padding: 20px;
      border-radius: 5px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #0066cc;
    }
    .header .company {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    .employee-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      font-size: 11px;
      padding: 10px;
      background-color: #fafafa;
      border-radius: 5px;
      border: 1px solid #e0e0e0;
    }
    .employee-details .detail-item {
      padding: 5px 0;
      border-bottom: 1px dotted #ddd;
    }
    .employee-details .detail-item:last-child {
      border-bottom: none;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10px;
    }
    .table th {
      background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
      padding: 10px 8px;
      text-align: right;
      border-bottom: 2px solid #0066cc;
      font-weight: bold;
      color: #333;
    }
    .table td {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
      text-align: right;
    }
    .table tbody tr:hover {
      background-color: #f8f9fa;
    }
    .table .number {
      text-align: left;
      font-family: 'Courier New', monospace;
    }
    .table .total-row {
      font-weight: bold;
      border-top: 2px solid #0066cc;
      background-color: #f0f8ff;
      font-size: 11px;
    }
    .net-salary {
      font-size: 24px;
      font-weight: bold;
      text-align: right;
      margin: 25px 0;
      padding: 20px;
      background: linear-gradient(to left, #0066cc, #004499);
      color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .summary-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      background: linear-gradient(to bottom, #fff, #f8f9fa);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      font-size: 12px;
      margin-bottom: 8px;
      color: #666;
    }
    .summary-card .value {
      font-size: 14px;
      font-weight: bold;
    }
    .balances {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .balance-panel {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      background: linear-gradient(to bottom, #fff, #f8f9fa);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .balance-panel h3 {
      font-size: 12px;
      margin-bottom: 8px;
      color: #666;
    }
    .balance-item {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #666;
      text-align: right;
    }
    @media print {
      body {
        margin: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>תלוש שכר – ${month} ${year}</h1>
    <div class="company">${payslipData.company.name || 'שם חברה לא זמין'}${payslipData.company.registration_number ? ` | ח.פ. ${payslipData.company.registration_number}` : ''}</div>
  </div>

  <div class="section">
    <div class="section-title">פרטי עובד</div>
    <div class="employee-details">
      <div class="detail-item"><strong>שם מלא:</strong> ${payslipData.employee.full_name}</div>
      <div class="detail-item"><strong>מספר עובד:</strong> ${payslipData.employee.employee_id}</div>
      <div class="detail-item"><strong>תעודת זהות:</strong> ${payslipData.employee.national_id}</div>
      <div class="detail-item"><strong>כתובת:</strong> ${payslipData.employee.address || 'לא צוין'}</div>
      <div class="detail-item"><strong>תאריך תחילת עבודה:</strong> ${formatDate(payslipData.employee.employment_start_date)}</div>
      <div class="detail-item"><strong>ותק:</strong> ${payslipData.employee.seniority_years} שנים</div>
      <div class="detail-item"><strong>אחוז משרה:</strong> ${payslipData.employee.job_percentage}%</div>
      <div class="detail-item"><strong>מחלקה:</strong> ${payslipData.employee.department || 'לא צוין'}</div>
      <div class="detail-item"><strong>מרכז עבודה:</strong> ${payslipData.employee.work_center || 'לא צוין'}</div>
      <div class="detail-item"><strong>תפקיד:</strong> ${payslipData.employee.position || 'לא צוין'}</div>
      <div class="detail-item"><strong>דרגה:</strong> ${payslipData.employee.grade || 'לא צוין'}</div>
      <div class="detail-item"><strong>מצב משפחתי:</strong> ${payslipData.employee.marital_status || 'לא צוין'}</div>
      <div class="detail-item"><strong>בנק:</strong> ${payslipData.employee.bank_name || 'לא צוין'}</div>
      <div class="detail-item"><strong>סניף:</strong> ${payslipData.employee.branch_number || 'לא צוין'}</div>
      <div class="detail-item"><strong>חשבון:</strong> ${payslipData.employee.account_number || 'לא צוין'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">תשלומים</div>
    <table class="table">
      <thead>
        <tr>
          <th>קוד</th>
          <th>תיאור</th>
          <th class="number">כמות</th>
          <th class="number">תעריף</th>
          <th class="number">ערך חייב במס</th>
          <th class="number">סכום</th>
        </tr>
      </thead>
      <tbody>
        ${payslipData.earnings.map((earning: any) => `
          <tr>
            <td>${earning.code || ''}</td>
            <td>${earning.description || ''}</td>
            <td class="number">${earning.quantity || 0}</td>
            <td class="number">${formatCurrency(earning.rate || 0)}</td>
            <td class="number">${formatCurrency(earning.taxable_value || 0)}</td>
            <td class="number">${formatCurrency(earning.amount || 0)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="5"><strong>סה״כ תשלומים</strong></td>
          <td class="number"><strong>${formatCurrency(payslipData.totals.total_earnings || 0)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">ניכויים</div>
    <table class="table">
      <thead>
        <tr>
          <th>תיאור</th>
          <th class="number">סכום</th>
        </tr>
      </thead>
      <tbody>
        ${payslipData.deductions.map((deduction: any) => `
          <tr>
            <td>${deduction.description || ''}</td>
            <td class="number">${formatCurrency(deduction.amount || 0)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td><strong>סה״כ ניכויים</strong></td>
          <td class="number"><strong>${formatCurrency(payslipData.totals.total_deductions || 0)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="net-salary">
    <div style="font-size: 18px; margin-bottom: 8px; opacity: 0.9;">שכר נטו</div>
    <div style="font-size: 36px; font-weight: 900; letter-spacing: 1px;">₪${formatCurrency(payslipData.totals.net_salary || 0)}</div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <h3>נתוני מס</h3>
      <div class="value">שכר חייב במס: ₪${formatCurrency(payslipData.totals.taxable_salary || 0)}</div>
      <div class="value">שכר מבוטח: ₪${formatCurrency(payslipData.totals.insured_salary || 0)}</div>
      <div class="value">אחוז מס: ${(payslipData.totals.tax_percentage || 0).toFixed(2)}%</div>
      <div class="value">נקודות זיכוי: ${payslipData.totals.credit_points || 0}</div>
    </div>
    <div class="summary-card">
      <h3>נוכחות</h3>
      <div class="value">ימי עבודה: ${payslipData.attendance.work_days || 0}</div>
      <div class="value">שעות עבודה: ${payslipData.attendance.work_hours || 0}</div>
      <div class="value">ימי היעדרות: ${payslipData.attendance.absence_days || 0}</div>
    </div>
  </div>

  <div class="balances">
    <div class="balance-panel">
      <h3>יתרות חופשה</h3>
      <div class="balance-item">
        <span>יתרה קודמת:</span>
        <span>${payslipData.balances.vacation.previous_balance || 0}</span>
      </div>
      <div class="balance-item">
        <span>נצבר:</span>
        <span>${payslipData.balances.vacation.accrued || 0}</span>
      </div>
      <div class="balance-item">
        <span>נוצל:</span>
        <span>${payslipData.balances.vacation.used || 0}</span>
      </div>
      <div class="balance-item">
        <span><strong>יתרה חדשה:</strong></span>
        <span><strong>${payslipData.balances.vacation.new_balance || 0}</strong></span>
      </div>
    </div>
    <div class="balance-panel">
      <h3>יתרות מחלה</h3>
      <div class="balance-item">
        <span>יתרה קודמת:</span>
        <span>${payslipData.balances.sick.previous_balance || 0}</span>
      </div>
      <div class="balance-item">
        <span>נצבר:</span>
        <span>${payslipData.balances.sick.accrued || 0}</span>
      </div>
      <div class="balance-item">
        <span>נוצל:</span>
        <span>${payslipData.balances.sick.used || 0}</span>
      </div>
      <div class="balance-item">
        <span><strong>יתרה חדשה:</strong></span>
        <span><strong>${payslipData.balances.sick.new_balance || 0}</strong></span>
      </div>
    </div>
  </div>

  <div class="footer">
    <div>תאריך יצירה: ${formatDate(payslipData.payslip.generation_date)}</div>
    <div>מספר תלוש: ${payslipData.payslip.id}</div>
    <div>גרסה: ${payslipData.payslip.version}</div>
    <div>נוצר על ידי PayLens</div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate PDF using Puppeteer (better Hebrew/RTL support)
   */
  async generatePayslipPDF(payslipData: any): Promise<Buffer> {
    try {
      const puppeteer = require('puppeteer');
      
      this.logger.log('Starting PDF generation with Puppeteer');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      const page = await browser.newPage();
      
      // Increase timeout for page operations (default is 30 seconds, increase to 60)
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);
      
      // Generate HTML
      const html = this.generatePayslipHTML(payslipData);
      
      // Set content and wait for fonts/styles to load
      // Use 'domcontentloaded' instead of 'networkidle0' to avoid timeout issues
      // since we're using inline HTML with no external resources
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      
      // Wait a bit for fonts to render properly (using setTimeout instead of waitForTimeout)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate PDF with proper settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm',
        },
        printBackground: true,
        preferCSSPageSize: false,
      });
      
      await browser.close();
      
      this.logger.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);
      return Buffer.from(pdfBuffer);
    } catch (error: any) {
      this.logger.error('PDF generation error with Puppeteer:', error);
      
      // Fallback to pdfkit if puppeteer fails
      this.logger.warn('Falling back to pdfkit');
      return this.generatePayslipPDFWithPdfKit(payslipData);
    }
  }

  /**
   * Fallback: Generate PDF using pdfkit (limited Hebrew support)
   */
  private async generatePayslipPDFWithPdfKit(payslipData: any): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      layout: 'portrait',
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('he-IL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    doc.font('Helvetica');
    doc.fontSize(20).text(
      `תלוש שכר – ${monthNames[payslipData.payslip.month - 1]} ${payslipData.payslip.year}`,
      { align: 'right' }
    );

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
    });
  }
}

