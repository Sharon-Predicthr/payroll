import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PdfGeneratorHtmlTemplate2Service {
  private readonly logger = new Logger(PdfGeneratorHtmlTemplate2Service.name);

  /**
   * Generate HTML template for payslip - Template 2 (Israeli Standard Format)
   * Based on the provided PDF example
   */
  private generatePayslipHTML(payslipData: any): string {
    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    const formatCurrency = (amount: number): string => {
      if (!amount && amount !== 0) return '0.00';
      return new Intl.NumberFormat('he-IL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const formatDate = (dateString: string): string => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const month = monthNames[payslipData.payslip.month - 1] || 'חודש';
    const year = payslipData.payslip.year;
    const periodText = `${month}/${year}`;

    // Extract data with fallbacks
    const company = payslipData.company || {};
    const employee = payslipData.employee || {};
    const earnings = payslipData.earnings || [];
    const deductions = payslipData.deductions || [];
    const totals = payslipData.totals || {};
    const attendance = payslipData.attendance || {};
    const balances = payslipData.balances || { vacation: {}, sick: {} };

    // Calculate mandatory deductions (tax, national insurance, health tax)
    // Handle both old format (array of {description, amount}) and new format (with item_type)
    const mandatoryDeductions = Array.isArray(deductions) 
      ? deductions.filter((d: any) => 
          d.item_type === '2-DEDUCTION' || 
          d.item_type === '3-INSURANCE' || 
          d.item_type === '4-KH-EDUCATION' ||
          (!d.item_type && (d.description?.includes('מס הכנסה') || d.description?.includes('ב.לאומי') || d.description?.includes('מס בריאות')))
        )
      : [];
    const optionalDeductions = Array.isArray(deductions)
      ? deductions.filter((d: any) => 
          d.item_type === '5-DEDUCTION' ||
          (!d.item_type && d.description && !mandatoryDeductions.includes(d))
        )
      : [];

    const totalMandatoryDeductions = mandatoryDeductions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    const totalOptionalDeductions = optionalDeductions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>תלוש שכר לחודש ${periodText}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica', 'Segoe UI', 'Tahoma', 'David', 'Guttman Yad', sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #000;
      direction: rtl;
      background: #fff;
    }
    .header {
      text-align: right;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #000;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .header-title {
      font-size: 16px;
      font-weight: bold;
      text-align: right;
    }
    .header-date {
      font-size: 10px;
      text-align: left;
    }
    .header-info {
      font-size: 9px;
      line-height: 1.6;
      margin-top: 5px;
    }
    .header-info-row {
      display: flex;
      gap: 15px;
      margin-bottom: 2px;
    }
    .header-info-item {
      display: flex;
      gap: 5px;
    }
    .header-info-label {
      font-weight: bold;
    }
    .section {
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 5px;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
    }
    .personal-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 9px;
      margin-bottom: 10px;
    }
    .personal-details-left, .personal-details-right {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .detail-row {
      display: flex;
      gap: 8px;
    }
    .detail-label {
      font-weight: bold;
      min-width: 80px;
    }
    .detail-value {
      flex: 1;
    }
    .address-section {
      margin: 10px 0;
      font-size: 9px;
    }
    .address-title {
      font-weight: bold;
      margin-bottom: 3px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
      font-size: 9px;
    }
    .table th, .table td {
      border: 1px solid #000;
      padding: 4px 6px;
      text-align: right;
    }
    .table th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    .table .number {
      text-align: left;
      font-family: 'Courier New', monospace;
    }
    .table .center {
      text-align: center;
    }
    .deductions-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 10px 0;
    }
    .deductions-box {
      border: 1px solid #000;
      padding: 8px;
    }
    .deductions-title {
      font-weight: bold;
      margin-bottom: 5px;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
    }
    .deduction-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 9px;
    }
    .deduction-label {
      flex: 1;
    }
    .deduction-amount {
      text-align: left;
      font-family: 'Courier New', monospace;
      min-width: 80px;
    }
    .earnings-table {
      margin: 10px 0;
    }
    .totals-section {
      margin: 15px 0;
      border: 2px solid #000;
      padding: 10px;
      text-align: center;
    }
    .totals-title {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .totals-amount {
      font-size: 18px;
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }
    .balances-section {
      margin: 10px 0;
    }
    .balances-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 5px;
    }
    .balance-box {
      border: 1px solid #000;
      padding: 8px;
      font-size: 9px;
    }
    .balance-title {
      font-weight: bold;
      margin-bottom: 5px;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
    }
    .balance-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .additional-data {
      margin: 10px 0;
      font-size: 8px;
    }
    .additional-data-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .additional-data-box {
      border: 1px solid #000;
      padding: 6px;
    }
    .additional-data-title {
      font-weight: bold;
      margin-bottom: 3px;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
    }
    .additional-data-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1px;
      font-size: 8px;
    }
    .footer {
      margin-top: 15px;
      padding-top: 5px;
      border-top: 1px solid #000;
      font-size: 8px;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-top">
      <div class="header-title">תלוש שכר לחודש ${periodText}</div>
      <div class="header-date">${formatDate(new Date().toISOString())} דף 1 מתוך 1</div>
    </div>
    <div class="header-info">
      <div class="header-info-row">
        <div class="header-info-item">
          <span class="header-info-label">תיק ניכרים:</span>
          <span>${employee.national_id || ''}</span>
        </div>
        <div class="header-info-item">
          <span class="header-info-label">מספר תאגיד:</span>
          <span>${company.registration_number || ''}</span>
        </div>
        <div class="header-info-item">
          <span class="header-info-label">תיק ב"ל:</span>
          <span>${employee.national_id || ''}00</span>
        </div>
      </div>
      <div class="header-info-row">
        <div class="header-info-item">
          <span class="header-info-label">חברה:</span>
          <span>${company.name || ''}</span>
        </div>
        <div class="header-info-item">
          <span class="header-info-label">כתובת:</span>
          <span>${company.address || ''}</span>
        </div>
        <div class="header-info-item">
          <span class="header-info-label">ישוב:</span>
          <span>${company.city || ''}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Personal Details -->
  <div class="section">
    <div class="section-title">פרטים אישיים</div>
    <div class="personal-details">
      <div class="personal-details-left">
        <div class="detail-row">
          <span class="detail-label">מספר העובד:</span>
          <span class="detail-value">${employee.employee_id || ''}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">תושב:</span>
          <span class="detail-value">${employee.is_resident ? 'כן' : 'לא'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">משרה ב"ל:</span>
          <span class="detail-value">עיקרית</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">חלקית המשרה:</span>
          <span class="detail-value">${((employee.job_percentage || 0) / 100).toFixed(4)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ותק:</span>
          <span class="detail-value">${formatDate(employee.employment_start_date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">תחילת עבודה:</span>
          <span class="detail-value">${formatDate(employee.employment_start_date)}</span>
        </div>
      </div>
      <div class="personal-details-right">
        <div class="detail-row">
          <span class="detail-label">מספר זהות:</span>
          <span class="detail-value">${employee.national_id || ''}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">משרה:</span>
          <span class="detail-value">${employee.position || ''}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">בסיס השכר:</span>
          <span class="detail-value">חודשי</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">מחלקה:</span>
          <span class="detail-value">${employee.department || ''}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">מצב משפחתי:</span>
          <span class="detail-value">${employee.marital_status || ''}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">דרוג:</span>
          <span class="detail-value">${employee.grade || ''}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">בנק:</span>
          <span class="detail-value">${employee.bank_name || ''}/${employee.branch_number || ''}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">חשבון:</span>
          <span class="detail-value">${employee.account_number || ''}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Address -->
  <div class="address-section">
    <div class="section-title">לכבוד</div>
    <div>${employee.full_name || ''}</div>
    <div>${employee.address || ''}</div>
  </div>

  <!-- Deductions - Mandatory -->
  <div class="deductions-section">
    <div class="deductions-box">
      <div class="deductions-title">הניכוי | נכויי חובה</div>
      ${mandatoryDeductions.length > 0 ? mandatoryDeductions.map((d: any) => `
        <div class="deduction-row">
          <span class="deduction-amount">${formatCurrency(d.amount || 0)}</span>
          <span class="deduction-label">${d.description || d.item_name || ''}</span>
        </div>
      `).join('') : '<div class="deduction-row"><span class="deduction-label">אין ניכויי חובה</span></div>'}
      <div class="deduction-row" style="border-top: 1px solid #000; padding-top: 3px; margin-top: 5px; font-weight: bold;">
        <span class="deduction-amount">${formatCurrency(totalMandatoryDeductions)}</span>
        <span class="deduction-label">ניכויי חובה</span>
      </div>
    </div>
    <div class="deductions-box">
      <div class="deductions-title">התשלום | התשלום</div>
      ${earnings.length > 0 ? earnings.map((e: any) => `
        <div class="deduction-row">
          <span class="deduction-amount">${formatCurrency(e.amount || 0)}</span>
          <span class="deduction-label">${e.description || e.item_name || ''}</span>
        </div>
      `).join('') : '<div class="deduction-row"><span class="deduction-label">אין תשלומים</span></div>'}
      <div class="deduction-row" style="border-top: 1px solid #000; padding-top: 3px; margin-top: 5px; font-weight: bold;">
        <span class="deduction-amount">${formatCurrency(totals.total_earnings || 0)}</span>
        <span class="deduction-label">סה"כ תשלומים</span>
      </div>
    </div>
  </div>

  <!-- Earnings Table -->
  <div class="earnings-table">
    <table class="table">
      <thead>
        <tr>
          <th>כמות</th>
          <th>תעריף</th>
          <th>גילום</th>
          <th>שווי למס</th>
          <th>התשלום</th>
        </tr>
      </thead>
      <tbody>
        ${earnings.map((e: any) => `
          <tr>
            <td class="number">${formatCurrency(e.quantity || e.amount || 0)}</td>
            <td class="number">${formatCurrency(e.rate || 1)}</td>
            <td class="number"></td>
            <td class="number"></td>
            <td class="number">${formatCurrency(e.amount || 0)}</td>
          </tr>
        `).join('')}
        <tr>
          <td colspan="4" style="text-align: right; font-weight: bold;">סה"כ</td>
          <td class="number" style="font-weight: bold;">${formatCurrency(totals.total_earnings || 0)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Optional Deductions -->
  ${optionalDeductions.length > 0 ? `
    <div class="deductions-box" style="margin-top: 10px;">
      <div class="deductions-title">הניכוי | נכויי רשות</div>
      ${optionalDeductions.map((d: any) => `
        <div class="deduction-row">
          <span class="deduction-amount">${formatCurrency(d.amount || 0)}</span>
          <span class="deduction-label">${d.description || d.item_name || ''}</span>
        </div>
      `).join('')}
      <div class="deduction-row" style="border-top: 1px solid #000; padding-top: 3px; margin-top: 5px; font-weight: bold;">
        <span class="deduction-amount">${formatCurrency(totalOptionalDeductions)}</span>
        <span class="deduction-label">נכויי רשות</span>
      </div>
    </div>
  ` : ''}

  <!-- Vacation Balance -->
  <div class="balances-section">
    <div class="section-title">נתונים מצטברים</div>
    <div class="balances-grid">
      <div class="balance-box">
        <div class="balance-title">חשבון חופשה</div>
        <div class="balance-row">
          <span>יתרה קודמת</span>
          <span>${balances.vacation?.previous_balance || 0}</span>
        </div>
        <div class="balance-row">
          <span>צבירה ח.ו.</span>
          <span>${balances.vacation?.accrued || 0}</span>
        </div>
        <div class="balance-row">
          <span>ניצול ח.ו.</span>
          <span>${balances.vacation?.used || 0}</span>
        </div>
        <div class="balance-row" style="border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; font-weight: bold;">
          <span>יתרה חדשה</span>
          <span>${balances.vacation?.new_balance || 0}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Additional Data -->
  <div class="additional-data">
    <div class="additional-data-grid">
      <div class="additional-data-box">
        <div class="additional-data-title">נתונים עובדים</div>
        <div class="additional-data-row">
          <span>י"ע בחברה</span>
          <span>${attendance.work_days || 0}</span>
        </div>
        <div class="additional-data-row">
          <span>ש"ע בחברה</span>
          <span>${attendance.work_hours || 0}</span>
        </div>
        <div class="additional-data-row">
          <span>שכר ח"ב מס</span>
          <span>${formatCurrency(totals.taxable_salary || 0)}</span>
        </div>
        <div class="additional-data-row">
          <span>שכר ב.לאומי</span>
          <span>${formatCurrency(totals.insured_salary || 0)}</span>
        </div>
        <div class="additional-data-row">
          <span>שכר מבוטח</span>
          <span>${formatCurrency(totals.insured_salary || 0)}</span>
        </div>
        <div class="additional-data-row">
          <span>בסיס קרה"ש</span>
          <span>${formatCurrency((totals.taxable_salary || 0) / (attendance.work_hours || 1))}</span>
        </div>
        <div class="additional-data-row">
          <span>ב.לאומי מצפיק</span>
          <span>${formatCurrency(totals.insured_salary || 0)}</span>
        </div>
        <div class="additional-data-row">
          <span>שכר מינ.חודש</span>
          <span>${formatCurrency(totals.insured_salary || 0)}</span>
        </div>
        <div class="additional-data-row">
          <span>שכר מינ.שעה</span>
          <span>${formatCurrency((totals.insured_salary || 0) / (attendance.work_hours || 1))}</span>
        </div>
      </div>
      <div class="additional-data-box">
        <div class="additional-data-title">נתונים ישירים</div>
        <div class="additional-data-row">
          <span>ישר עבודה</span>
          <span>${attendance.work_days || 0}</span>
        </div>
        <div class="additional-data-row">
          <span>שעות עבודה</span>
          <span>${attendance.work_hours || 0}</span>
        </div>
        <div class="additional-data-row">
          <span>שעות העדויות</span>
          <span>${attendance.work_hours || 0}</span>
        </div>
        <div class="additional-data-row">
          <span>שעות ליום</span>
          <span>${(attendance.work_hours || 0) / (attendance.work_days || 1)}</span>
        </div>
        <div class="additional-data-row">
          <span>נק. רגילות</span>
          <span>${totals.credit_points || 0}</span>
        </div>
        <div class="additional-data-row">
          <span>אחוז מס שולי</span>
          <span>${(totals.tax_percentage || 0).toFixed(2)}%</span>
        </div>
        <div class="additional-data-row">
          <span>קוד מהדורה</span>
          <span>${payslipData.payslip.version || '1.0'}</span>
        </div>
        <div class="additional-data-row">
          <span>חישוב מצטבר</span>
          <span>כן</span>
        </div>
        <div class="additional-data-row">
          <span>אופן תשלום</span>
          <span>העברה בנקאית</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Net Salary -->
  <div class="totals-section">
    <div class="totals-title">לתשלום</div>
    <div class="totals-amount">₪${formatCurrency(totals.net_salary || 0)}</div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>תלוש שכר נוצר על ידי PayLens</div>
    <div>תאריך יצירה: ${formatDate(payslipData.payslip.generation_date || new Date().toISOString())}</div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate PDF using Puppeteer
   */
  async generatePayslipPDF(payslipData: any): Promise<Buffer> {
    try {
      const puppeteer = require('puppeteer');
      
      this.logger.log('Starting PDF generation with Puppeteer (Template 2)');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);
      
      const html = this.generatePayslipHTML(payslipData);
      
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
        printBackground: true,
        preferCSSPageSize: false,
      });
      
      await browser.close();
      
      this.logger.log(`PDF generated successfully (Template 2), size: ${pdfBuffer.length} bytes`);
      return Buffer.from(pdfBuffer);
    } catch (error: any) {
      this.logger.error('PDF generation error with Puppeteer (Template 2):', error);
      throw error;
    }
  }
}

