import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PdfGeneratorHtmlService {
  private readonly logger = new Logger(PdfGeneratorHtmlService.name);

  /**
   * Generate HTML template for payslip (RTL, Hebrew support)
   */
  private generatePayslipHTML(payslipData: any): string {
    this.logger.log(`[generatePayslipHTML] Additional data received:`, JSON.stringify(payslipData?.additional_data || {}, null, 2));
    
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
    .section {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .summary-card {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .balance-panel {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica', 'Segoe UI', 'Tahoma', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #000;
      direction: rtl;
      background: #fff;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    * {
      font-family: inherit;
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
      grid-template-columns: repeat(3, 1fr);
      gap: 8px 15px;
      font-size: 10px;
      padding: 8px;
      background-color: #fafafa;
      border-radius: 5px;
      border: 1px solid #e0e0e0;
    }
    .employee-details .detail-item {
      padding: 3px 0;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #ddd;
    }
    .employee-details .detail-item:last-child {
      border-bottom: none;
    }
    .employee-details .detail-item strong {
      margin-left: 8px;
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
    }
    .table .total-row {
      font-weight: bold;
      border-top: 2px solid #0066cc;
      background-color: #f0f8ff;
      font-size: 11px;
    }
    .net-salary {
      font-size: 16px;
      font-weight: bold;
      text-align: right;
      margin: 15px 0;
      padding: 12px 20px;
      background: linear-gradient(to left, #0066cc, #004499);
      color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .net-salary .net-amount {
      font-size: 24px;
      margin-top: 5px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 15px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .summary-grid .summary-card {
      min-width: 0;
      padding: 10px;
      font-size: 10px;
    }
    .summary-grid .summary-card h3 {
      font-size: 11px;
      margin-bottom: 8px;
    }
    .summary-grid .summary-card .value {
      font-size: 9px;
      padding: 2px 0;
    }
    .summary-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      background: linear-gradient(to bottom, #fff, #f8f9fa);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .summary-card .value {
      font-size: 11px;
      font-weight: normal;
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .summary-card .value span:first-child {
      margin-left: 10px;
    }
    .balances {
      display: none;
    }
    .balance-panel {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      background: linear-gradient(to bottom, #fff, #f8f9fa);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .balance-panel h3 {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
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
      <div class="detail-item"><strong>שם מלא:</strong><span>${payslipData.employee.full_name}</span></div>
      <div class="detail-item"><strong>מספר עובד:</strong><span>${payslipData.employee.employee_id}</span></div>
      <div class="detail-item"><strong>תעודת זהות:</strong><span>${payslipData.employee.national_id}</span></div>
      <div class="detail-item"><strong>כתובת:</strong><span>${payslipData.employee.address || 'לא צוין'}</span></div>
      <div class="detail-item"><strong>תאריך תחילת עבודה:</strong><span>${formatDate(payslipData.employee.employment_start_date)}</span></div>
      <div class="detail-item"><strong>ותק:</strong><span>${payslipData.employee.seniority_years} שנים</span></div>
      <div class="detail-item"><strong>אחוז משרה:</strong><span>${payslipData.employee.job_percentage}%</span></div>
      <div class="detail-item"><strong>מחלקה:</strong><span>${payslipData.employee.department || 'לא צוין'}</span></div>
      <div class="detail-item"><strong>מרכז עבודה:</strong><span>${payslipData.employee.work_center || 'לא צוין'}</span></div>
      <div class="detail-item"><strong>תפקיד:</strong><span>${payslipData.employee.position || 'לא צוין'}</span></div>
      <div class="detail-item"><strong>דרגה:</strong><span>${payslipData.employee.grade || 'לא צוין'}</span></div>
      <div class="detail-item"><strong>מצב משפחתי:</strong><span>${payslipData.employee.marital_status || 'לא צוין'}</span></div>
      <div class="detail-item"><strong>בנק:</strong><span>${payslipData.employee.bank_name || 'לא צוין'}</span></div>
      <div class="detail-item"><strong>סניף:</strong><span>${payslipData.employee.branch_number || 'לא צוין'}</span></div>
      <div class="detail-item"><strong>חשבון:</strong><span>${payslipData.employee.account_number || 'לא צוין'}</span></div>
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
    <div>שכר נטו</div>
    <div class="net-amount">₪${formatCurrency(payslipData.totals.net_salary || 0)}</div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <h3>נתוני מס</h3>
      <div class="value"><span>שכר חייב במס:</span><span>₪${formatCurrency(payslipData.totals.taxable_salary || 0)}</span></div>
      <div class="value"><span>שכר מבוטח:</span><span>₪${formatCurrency(payslipData.totals.insured_salary || 0)}</span></div>
      <div class="value"><span>אחוז מס:</span><span>${(payslipData.totals.tax_percentage || 0).toFixed(2)}%</span></div>
      <div class="value"><span>נקודות זיכוי:</span><span>${payslipData.totals.credit_points || 0}</span></div>
    </div>
    <div class="summary-card">
      <h3>נוכחות</h3>
      <div class="value"><span>ימי עבודה:</span><span>${payslipData.attendance.work_days || 0}</span></div>
      <div class="value"><span>שעות עבודה:</span><span>${payslipData.attendance.work_hours || 0}</span></div>
      <div class="value"><span>ימי היעדרות:</span><span>${payslipData.attendance.absence_days || 0}</span></div>
    </div>
    <div class="summary-card">
      <h3>יתרות חופשה</h3>
      <div class="value"><span>יתרה קודמת:</span><span>${payslipData.balances.vacation.previous_balance || 0}</span></div>
      <div class="value"><span>נצבר:</span><span>${payslipData.balances.vacation.accrued || 0}</span></div>
      <div class="value"><span>נוצל:</span><span>${payslipData.balances.vacation.used || 0}</span></div>
      <div class="value"><span>יתרה חדשה:</span><span>${payslipData.balances.vacation.new_balance || 0}</span></div>
    </div>
    <div class="summary-card">
      <h3>יתרות מחלה</h3>
      <div class="value"><span>יתרה קודמת:</span><span>${payslipData.balances.sick.previous_balance || 0}</span></div>
      <div class="value"><span>נצבר:</span><span>${payslipData.balances.sick.accrued || 0}</span></div>
      <div class="value"><span>נוצל:</span><span>${payslipData.balances.sick.used || 0}</span></div>
      <div class="value"><span>יתרה חדשה:</span><span>${payslipData.balances.sick.new_balance || 0}</span></div>
    </div>
  </div>
  ${this.generateAdditionalDataSection(payslipData)}

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
   * Generate additional data section HTML
   */
  private generateAdditionalDataSection(payslipData: any): string {
    const additionalData = payslipData?.additional_data;
    if (!additionalData) {
      return '';
    }

    const formatCurrency = (amount: number | null | undefined): string => {
      if (amount === null || amount === undefined) return '0.00';
      const numAmount = Number(amount);
      if (isNaN(numAmount)) return '0.00';
      return new Intl.NumberFormat('he-IL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numAmount);
    };

    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'number') return value.toString();
      return String(value);
    };

    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL');
      } catch {
        return dateString;
      }
    };

    let html = '';

    // General Information and Monthly Tax Information - side by side
    const generalInfo = additionalData.general_info || {};
    const monthlyInfo = additionalData.monthly_tax_info || {};
    
    if (Object.keys(generalInfo).length > 0 || Object.keys(monthlyInfo).length > 0) {
      html += `
  <div class="section">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      ${Object.keys(generalInfo).length > 0 ? `
      <div>
        <div class="section-title">מידע כללי</div>
        <div class="balance-panel" style="padding: 10px;">
      ${generalInfo.department_number !== null && generalInfo.department_number !== undefined ? `<div class="balance-item"><span>מספר מחלקה:</span><span>${formatValue(generalInfo.department_number)}</span></div>` : ''}
      ${generalInfo.department_name ? `<div class="balance-item"><span>תיאור מחלקה:</span><span>${formatValue(generalInfo.department_name)}</span></div>` : ''}
      ${generalInfo.employee_address ? `<div class="balance-item"><span>כתובת:</span><span>${formatValue(generalInfo.employee_address)}</span></div>` : ''}
      ${generalInfo.employee_national_id ? `<div class="balance-item"><span>ת.ז.:</span><span>${formatValue(generalInfo.employee_national_id)}</span></div>` : ''}
      ${generalInfo.tariff_monthly !== null && generalInfo.tariff_monthly !== undefined ? `<div class="balance-item"><span>תעריף חודשי:</span><span>${formatCurrency(generalInfo.tariff_monthly)}</span></div>` : ''}
      ${generalInfo.tariff_daily !== null && generalInfo.tariff_daily !== undefined ? `<div class="balance-item"><span>תעריף יומי:</span><span>${formatCurrency(generalInfo.tariff_daily)}</span></div>` : ''}
      ${generalInfo.tariff_hourly !== null && generalInfo.tariff_hourly !== undefined ? `<div class="balance-item"><span>תעריף שעתי:</span><span>${formatCurrency(generalInfo.tariff_hourly)}</span></div>` : ''}
      ${generalInfo.standard_hours_per_month !== null && generalInfo.standard_hours_per_month !== undefined ? `<div class="balance-item"><span>שעות עבודה בחודש:</span><span>${formatValue(generalInfo.standard_hours_per_month)}</span></div>` : ''}
      ${generalInfo.start_of_work ? `<div class="balance-item"><span>תחילת עבודה:</span><span>${formatDate(generalInfo.start_of_work)}</span></div>` : ''}
      ${generalInfo.seniority_years !== null && generalInfo.seniority_years !== undefined ? `<div class="balance-item"><span>שנות ותק:</span><span>${formatValue(generalInfo.seniority_years)}</span></div>` : ''}
      ${generalInfo.seniority_months !== null && generalInfo.seniority_months !== undefined ? `<div class="balance-item"><span>חודשי ותק:</span><span>${formatValue(generalInfo.seniority_months)}</span></div>` : ''}
      ${generalInfo.job_pct !== null && generalInfo.job_pct !== undefined ? `<div class="balance-item"><span>אחוז משרה:</span><span>${formatValue(generalInfo.job_pct)}%</span></div>` : ''}
      ${generalInfo.partial_period_pct !== null && generalInfo.partial_period_pct !== undefined ? `<div class="balance-item"><span>שיעור תשלום:</span><span>${formatValue(generalInfo.partial_period_pct)}%</span></div>` : ''}
      ${generalInfo.tax_credit_points !== null && generalInfo.tax_credit_points !== undefined ? `<div class="balance-item"><span>נקודות זיכוי:</span><span>${formatValue(generalInfo.tax_credit_points)}</span></div>` : ''}
      ${generalInfo.tax_pct_level !== null && generalInfo.tax_pct_level !== undefined ? `<div class="balance-item"><span>אחוז מס שולי:</span><span>${formatValue(generalInfo.tax_pct_level)}%</span></div>` : ''}
      ${generalInfo.ytd_months_of_work !== null && generalInfo.ytd_months_of_work !== undefined ? `<div class="balance-item"><span>חודשי עבודה:</span><span>${formatValue(generalInfo.ytd_months_of_work)}</span></div>` : ''}
      ${generalInfo.employer_tax_file_number ? `<div class="balance-item"><span>תיק ניכויים מעסיק:</span><span>${formatValue(generalInfo.employer_tax_file_number)}</span></div>` : ''}
      ${generalInfo.employer_national_insurance_number ? `<div class="balance-item"><span>מספר מעסיק ב.ל.:</span><span>${formatValue(generalInfo.employer_national_insurance_number)}</span></div>` : ''}
      ${generalInfo.bank_code ? `<div class="balance-item"><span>קוד בנק:</span><span>${formatValue(generalInfo.bank_code)}</span></div>` : ''}
      ${generalInfo.branch_code ? `<div class="balance-item"><span>קוד סניף:</span><span>${formatValue(generalInfo.branch_code)}</span></div>` : ''}
      ${generalInfo.account_number ? `<div class="balance-item"><span>מספר חשבון:</span><span>${formatValue(generalInfo.account_number)}</span></div>` : ''}
        </div>
      </div>
      ` : ''}
      ${Object.keys(monthlyInfo).length > 0 ? `
      <div>
        <div class="section-title">מידע מס חודשי</div>
        <div class="balance-panel" style="padding: 10px;">
      ${monthlyInfo.tax_credit_points !== null && monthlyInfo.tax_credit_points !== undefined ? `<div class="balance-item"><span>נקודות זיכוי:</span><span>${formatValue(monthlyInfo.tax_credit_points)}</span></div>` : ''}
      ${monthlyInfo.tax_pct_level !== null && monthlyInfo.tax_pct_level !== undefined ? `<div class="balance-item"><span>אחוז מס שולי:</span><span>${formatValue(monthlyInfo.tax_pct_level)}%</span></div>` : ''}
      ${monthlyInfo.severance_monthly !== null && monthlyInfo.severance_monthly !== undefined ? `<div class="balance-item"><span>פיצויים חודשי:</span><span>${formatCurrency(monthlyInfo.severance_monthly)}</span></div>` : ''}
      ${monthlyInfo.severance_gross_monthly !== null && monthlyInfo.severance_gross_monthly !== undefined ? `<div class="balance-item"><span>שכר לפיצויים:</span><span>${formatCurrency(monthlyInfo.severance_gross_monthly)}</span></div>` : ''}
      ${monthlyInfo.kpg_employer_monthly !== null && monthlyInfo.kpg_employer_monthly !== undefined ? `<div class="balance-item"><span>קופ"ג מעסיק:</span><span>${formatCurrency(monthlyInfo.kpg_employer_monthly)}</span></div>` : ''}
      ${monthlyInfo.kpg_gross_monthly !== null && monthlyInfo.kpg_gross_monthly !== undefined ? `<div class="balance-item"><span>שכר לקופ"ג:</span><span>${formatCurrency(monthlyInfo.kpg_gross_monthly)}</span></div>` : ''}
      ${monthlyInfo.khs_employer_monthly !== null && monthlyInfo.khs_employer_monthly !== undefined ? `<div class="balance-item"><span>קה"ל מעסיק חודשי:</span><span>${formatCurrency(monthlyInfo.khs_employer_monthly)}</span></div>` : ''}
      ${monthlyInfo.khs_gross_monthly !== null && monthlyInfo.khs_gross_monthly !== undefined ? `<div class="balance-item"><span>שכר לקה"ל:</span><span>${formatCurrency(monthlyInfo.khs_gross_monthly)}</span></div>` : ''}
      ${monthlyInfo.city_tax_credit_month !== null && monthlyInfo.city_tax_credit_month !== undefined ? `<div class="balance-item"><span>הנחת ישוב:</span><span>${formatCurrency(monthlyInfo.city_tax_credit_month)}</span></div>` : ''}
      ${monthlyInfo.seif_47_exempt_month !== null && monthlyInfo.seif_47_exempt_month !== undefined ? `<div class="balance-item"><span>פטור סעיף 47:</span><span>${formatCurrency(monthlyInfo.seif_47_exempt_month)}</span></div>` : ''}
      ${monthlyInfo.shovi_monthly !== null && monthlyInfo.shovi_monthly !== undefined ? `<div class="balance-item"><span>שווי למס:</span><span>${formatCurrency(monthlyInfo.shovi_monthly)}</span></div>` : ''}
        </div>
      </div>
      ` : ''}
    </div>
  </div>`;
    }

    // Yearly/Accumulated Information - same width as general/monthly, keep on one page
    const yearlyInfo = additionalData.yearly_accumulated_info || {};
    if (Object.keys(yearlyInfo).length > 0) {
      html += `
  <div class="section" style="page-break-inside: avoid; break-inside: avoid;">
    <div class="section-title">מידע שנתי/מצטבר</div>
    <div style="display: grid; grid-template-columns: 1fr; gap: 0;">
      <div class="balance-panel" style="padding: 10px; max-width: 50%;">
      ${yearlyInfo.ytd_gross_payments !== null && yearlyInfo.ytd_gross_payments !== undefined ? `<div class="balance-item"><span>תשלומים:</span><span>${formatCurrency(yearlyInfo.ytd_gross_payments)}</span></div>` : ''}
      ${yearlyInfo.ytd_shovi !== null && yearlyInfo.ytd_shovi !== undefined ? `<div class="balance-item"><span>שכר שווה כסף:</span><span>${formatCurrency(yearlyInfo.ytd_shovi)}</span></div>` : ''}
      ${yearlyInfo.ytd_gross_for_tax !== null && yearlyInfo.ytd_gross_for_tax !== undefined ? `<div class="balance-item"><span>שכר חייב מס הכנסה:</span><span>${formatCurrency(yearlyInfo.ytd_gross_for_tax)}</span></div>` : ''}
      ${yearlyInfo.ytd_tax !== null && yearlyInfo.ytd_tax !== undefined ? `<div class="balance-item"><span>מס הכנסה:</span><span>${formatCurrency(yearlyInfo.ytd_tax)}</span></div>` : ''}
      ${yearlyInfo.ytd_bl_employee !== null && yearlyInfo.ytd_bl_employee !== undefined ? `<div class="balance-item"><span>ביטוח לאומי עובד:</span><span>${formatCurrency(yearlyInfo.ytd_bl_employee)}</span></div>` : ''}
      ${yearlyInfo.ytd_bl_employer !== null && yearlyInfo.ytd_bl_employer !== undefined ? `<div class="balance-item"><span>ביטוח לאומי מעסיק:</span><span>${formatCurrency(yearlyInfo.ytd_bl_employer)}</span></div>` : ''}
      ${yearlyInfo.ytd_health_employee !== null && yearlyInfo.ytd_health_employee !== undefined ? `<div class="balance-item"><span>ביטוח בריאות עובד:</span><span>${formatCurrency(yearlyInfo.ytd_health_employee)}</span></div>` : ''}
      ${yearlyInfo.ytd_health_employer !== null && yearlyInfo.ytd_health_employer !== undefined ? `<div class="balance-item"><span>ביטוח בריאות מעסיק:</span><span>${formatCurrency(yearlyInfo.ytd_health_employer)}</span></div>` : ''}
      ${yearlyInfo.ytd_35_tax_exempt !== null && yearlyInfo.ytd_35_tax_exempt !== undefined ? `<div class="balance-item"><span>גמול 35%:</span><span>${formatCurrency(yearlyInfo.ytd_35_tax_exempt)}</span></div>` : ''}
      ${yearlyInfo.ytd_khs_employer !== null && yearlyInfo.ytd_khs_employer !== undefined ? `<div class="balance-item"><span>קרן השתלמות מעסיק:</span><span>${formatCurrency(yearlyInfo.ytd_khs_employer)}</span></div>` : ''}
      ${yearlyInfo.ytd_khs_employee !== null && yearlyInfo.ytd_khs_employee !== undefined ? `<div class="balance-item"><span>קרן השתלמות עובד:</span><span>${formatCurrency(yearlyInfo.ytd_khs_employee)}</span></div>` : ''}
      ${yearlyInfo.ytd_47_tax_deduction !== null && yearlyInfo.ytd_47_tax_deduction !== undefined ? `<div class="balance-item"><span>ניכוי סעיף 47:</span><span>${formatCurrency(yearlyInfo.ytd_47_tax_deduction)}</span></div>` : ''}
      ${yearlyInfo.ytd_pension_employer !== null && yearlyInfo.ytd_pension_employer !== undefined ? `<div class="balance-item"><span>קופ"ג מעסיק:</span><span>${formatCurrency(yearlyInfo.ytd_pension_employer)}</span></div>` : ''}
      ${yearlyInfo.ytd_pension_employee !== null && yearlyInfo.ytd_pension_employee !== undefined ? `<div class="balance-item"><span>קופ"ג עובד:</span><span>${formatCurrency(yearlyInfo.ytd_pension_employee)}</span></div>` : ''}
      ${yearlyInfo.ytd_severance_employer !== null && yearlyInfo.ytd_severance_employer !== undefined ? `<div class="balance-item"><span>פיצויים מעסיק:</span><span>${formatCurrency(yearlyInfo.ytd_severance_employer)}</span></div>` : ''}
      ${yearlyInfo.ytd_credit_points_amount !== null && yearlyInfo.ytd_credit_points_amount !== undefined ? `<div class="balance-item"><span>סכום נקודות זיכוי:</span><span>${formatCurrency(yearlyInfo.ytd_credit_points_amount)}</span></div>` : ''}
      ${yearlyInfo.ytd_city_tax_credit !== null && yearlyInfo.ytd_city_tax_credit !== undefined ? `<div class="balance-item"><span>זיכוי מס עירוני:</span><span>${formatCurrency(yearlyInfo.ytd_city_tax_credit)}</span></div>` : ''}
      ${yearlyInfo.ytd_total_tax_credit !== null && yearlyInfo.ytd_total_tax_credit !== undefined ? `<div class="balance-item"><span>סה"כ זיכוי מס:</span><span>${formatCurrency(yearlyInfo.ytd_total_tax_credit)}</span></div>` : ''}
      </div>
    </div>
  </div>`;
    }

    return html;
  }

  /**
   * Generate PDF using Puppeteer (better Hebrew/RTL support)
   */
  async generatePayslipPDF(payslipData: any): Promise<Buffer> {
    // Generate HTML first - we'll use it for all PDF generation methods
    const html = this.generatePayslipHTML(payslipData);
    this.logger.log(`Generated HTML length: ${html.length} characters`);
    
    // Try Puppeteer
    try {
        let puppeteer;
        try {
          puppeteer = require('puppeteer-core');
          this.logger.log('Using puppeteer-core');
        } catch {
          puppeteer = require('puppeteer');
          this.logger.log('Using puppeteer (fallback)');
        }
        
        this.logger.log('Starting PDF generation with Puppeteer');
        
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
        
        const browser = await puppeteer.launch({
          headless: 'new',
          executablePath: executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-first-run',
          ],
          protocolTimeout: 60000,
          timeout: 30000,
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(60000);
        
        // Set UTF-8 encoding
        await page.setContent(html, {
          waitUntil: 'networkidle0',
          timeout: 60000,
        });
        
        // Wait for fonts and styles to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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
        
        this.logger.log(`PDF generated successfully with Puppeteer, size: ${pdfBuffer.length} bytes`);
        return Buffer.from(pdfBuffer);
      } catch (error: any) {
        this.logger.error('PDF generation error with Puppeteer:', error.message || error);
        this.logger.error('Stack:', error.stack);
        
        // Fallback to pdfkit if puppeteer fails
        this.logger.warn('Falling back to pdfkit');
        return this.generatePayslipPDFWithPdfKit(payslipData, html);
      }
  }

  /**
   * Fallback: Generate PDF using pdfkit (limited Hebrew support)
   * Note: This is a simple fallback. For better results, Puppeteer should work.
   */
  private async generatePayslipPDFWithPdfKit(payslipData: any, html?: string): Promise<Buffer> {
    this.logger.warn('[generatePayslipPDFWithPdfKit] Using pdfkit fallback - Creating comprehensive PDF');
    
    // Final fallback: comprehensive PDF with pdfkit using all available data
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      layout: 'portrait',
      autoFirstPage: true,
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const formatCurrency = (amount: number | null | undefined): string => {
      if (amount === null || amount === undefined) return '0.00';
      return new Intl.NumberFormat('he-IL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL');
      } catch {
        return dateString;
      }
    };

    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'number') return value.toString();
      return String(value);
    };

    // Helper function to write a label-value pair with proper alignment (like in tables)
    // Format: label (right) | value (left, aligned right)
    const writeTableRow = (label: string, value: string, fontSize: number = 11) => {
      doc.font('Helvetica').fontSize(fontSize);
      const pageWidth = doc.page.width;
      const margin = 50;
      const valueAreaWidth = 120; // Fixed width for value
      const currentY = doc.y;
      
      // Write label on the right side
      const labelX = pageWidth - margin;
      const labelWidth = pageWidth - margin * 2 - valueAreaWidth - 20; // Space for label (minus spacing)
      doc.text(label, labelX, currentY, { 
        align: 'right', 
        width: labelWidth 
      });
      
      // Write value on the left side (aligned right within its width)
      const valueX = margin + valueAreaWidth;
      doc.text(value, valueX, currentY, { 
        align: 'right', 
        width: valueAreaWidth 
      });
      
      doc.moveDown(0.3);
    };

    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    // Header
    doc.font('Helvetica-Bold').fontSize(20);
    const monthName = monthNames[(payslipData.payslip?.month || 1) - 1] || 'חודש';
    const year = payslipData.payslip?.year || new Date().getFullYear();
    doc.text(`תלוש שכר - ${monthName} ${year}`, { align: 'right' });
    
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(16);
    doc.text(`עובד: ${payslipData.employee?.full_name || 'N/A'}`, { align: 'right' });
    doc.font('Helvetica').fontSize(12);
    doc.text(`מספר עובד: ${payslipData.employee?.employee_id || 'N/A'}`, { align: 'right' });
    doc.text(`שכר נטו: ${formatCurrency(payslipData.totals?.net_salary)}`, { align: 'right' });
    doc.text(`שכר ברוטו: ${formatCurrency(payslipData.totals?.gross_salary)}`, { align: 'right' });
    
    // Employee details
    if (payslipData.employee) {
      doc.moveDown();
      doc.font('Helvetica-Bold').fontSize(14).text('פרטי עובד:', { align: 'right' });
      doc.font('Helvetica').fontSize(10);
      if (payslipData.employee.national_id) doc.text(`ת.ז.: ${payslipData.employee.national_id}`, { align: 'right' });
      if (payslipData.employee.department) doc.text(`מחלקה: ${payslipData.employee.department}`, { align: 'right' });
      if (payslipData.employee.position) doc.text(`תפקיד: ${payslipData.employee.position}`, { align: 'right' });
    }
    
    // Earnings
    if (payslipData.earnings && payslipData.earnings.length > 0) {
      doc.moveDown();
      doc.font('Helvetica-Bold').fontSize(14).text('תשלומים:', { align: 'right' });
      doc.font('Helvetica').fontSize(10);
      payslipData.earnings.forEach((earning: any) => {
        doc.text(`${earning.description || earning.code || ''}: ${formatCurrency(earning.amount)}`, { align: 'right' });
      });
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(`סה"כ תשלומים: ${formatCurrency(payslipData.totals?.total_earnings)}`, { align: 'right' });
    }
    
    // Deductions
    if (payslipData.deductions && payslipData.deductions.length > 0) {
      doc.moveDown();
      doc.font('Helvetica-Bold').fontSize(14).text('ניכויים:', { align: 'right' });
      doc.font('Helvetica').fontSize(10);
      payslipData.deductions.forEach((deduction: any) => {
        doc.text(`${deduction.description || ''}: ${formatCurrency(deduction.amount)}`, { align: 'right' });
      });
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(`סה"כ ניכויים: ${formatCurrency(payslipData.totals?.total_deductions)}`, { align: 'right' });
    }
    
    // Additional data - comprehensive with ALL fields
    const additionalData = payslipData?.additional_data;
    this.logger.warn(`[generatePayslipPDFWithPdfKit] additionalData exists: ${!!additionalData}`);
    this.logger.warn(`[generatePayslipPDFWithPdfKit] general_info exists: ${!!additionalData?.general_info}`);
    this.logger.warn(`[generatePayslipPDFWithPdfKit] monthly_tax_info exists: ${!!additionalData?.monthly_tax_info}`);
    this.logger.warn(`[generatePayslipPDFWithPdfKit] yearly_accumulated_info exists: ${!!additionalData?.yearly_accumulated_info}`);
    
    if (additionalData) {
      // General info - ALL fields - ALWAYS show section header even if empty
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(16).text('מידע כללי', { align: 'right' });
      doc.moveDown(0.3);
      
      if (additionalData.general_info) {
        const general = additionalData.general_info;
        
        if (general.department_number !== null && general.department_number !== undefined) {
          writeTableRow('מספר מחלקה:', formatValue(general.department_number));
        }
        if (general.department_name) {
          writeTableRow('תיאור מחלקה:', formatValue(general.department_name));
        }
        if (general.employee_address) {
          writeTableRow('כתובת:', formatValue(general.employee_address));
        }
        if (general.employee_national_id) {
          writeTableRow('ת.ז.:', formatValue(general.employee_national_id));
        }
        if (general.tariff_monthly !== null && general.tariff_monthly !== undefined) {
          writeTableRow('תעריף חודשי:', formatCurrency(general.tariff_monthly));
        }
        if (general.tariff_daily !== null && general.tariff_daily !== undefined) {
          writeTableRow('תעריף יומי:', formatCurrency(general.tariff_daily));
        }
        if (general.tariff_hourly !== null && general.tariff_hourly !== undefined) {
          writeTableRow('תעריף שעתי:', formatCurrency(general.tariff_hourly));
        }
        if (general.standard_hours_per_month !== null && general.standard_hours_per_month !== undefined) {
          writeTableRow('שעות עבודה בחודש:', formatValue(general.standard_hours_per_month));
        }
        if (general.start_of_work) {
          writeTableRow('תחילת עבודה:', formatDate(general.start_of_work));
        }
        if (general.seniority_years !== null && general.seniority_years !== undefined) {
          writeTableRow('שנות ותק:', formatValue(general.seniority_years));
        }
        if (general.seniority_months !== null && general.seniority_months !== undefined) {
          writeTableRow('חודשי ותק:', formatValue(general.seniority_months));
        }
        if (general.job_pct !== null && general.job_pct !== undefined) {
          writeTableRow('אחוז משרה:', `${formatValue(general.job_pct)}%`);
        }
        if (general.partial_period_pct !== null && general.partial_period_pct !== undefined) {
          writeTableRow('שיעור תשלום:', `${formatValue(general.partial_period_pct)}%`);
        }
        if (general.tax_credit_points !== null && general.tax_credit_points !== undefined) {
          writeTableRow('נקודות זיכוי:', formatValue(general.tax_credit_points));
        }
        if (general.tax_pct_level !== null && general.tax_pct_level !== undefined) {
          writeTableRow('אחוז מס שולי:', `${formatValue(general.tax_pct_level)}%`);
        }
        if (general.ytd_months_of_work !== null && general.ytd_months_of_work !== undefined) {
          writeTableRow('חודשי עבודה:', formatValue(general.ytd_months_of_work));
        }
        if (general.employer_tax_file_number) {
          writeTableRow('תיק ניכויים מעסיק:', formatValue(general.employer_tax_file_number));
        }
        if (general.employer_national_insurance_number) {
          writeTableRow('מספר מעסיק ב.ל.:', formatValue(general.employer_national_insurance_number));
        }
        if (general.bank_code) {
          writeTableRow('קוד בנק:', formatValue(general.bank_code));
        }
        if (general.branch_code) {
          writeTableRow('קוד סניף:', formatValue(general.branch_code));
        }
        if (general.account_number) {
          writeTableRow('מספר חשבון:', formatValue(general.account_number));
        }
      } else {
        doc.font('Helvetica').fontSize(11).text('אין נתונים זמינים', { align: 'right' });
      }
      
      // Monthly tax info - ALL fields - ALWAYS show section header
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(16).text('מידע מס חודשי', { align: 'right' });
      doc.moveDown(0.3);
      
      if (additionalData.monthly_tax_info) {
        const monthly = additionalData.monthly_tax_info;
        
        if (monthly.tax_credit_points !== null && monthly.tax_credit_points !== undefined) {
          writeTableRow('נקודות זיכוי:', formatValue(monthly.tax_credit_points));
        }
        if (monthly.tax_pct_level !== null && monthly.tax_pct_level !== undefined) {
          writeTableRow('אחוז מס שולי:', `${formatValue(monthly.tax_pct_level)}%`);
        }
        if (monthly.severance_monthly !== null && monthly.severance_monthly !== undefined) {
          writeTableRow('פיצויים חודשי:', formatCurrency(monthly.severance_monthly));
        }
        if (monthly.severance_gross_monthly !== null && monthly.severance_gross_monthly !== undefined) {
          writeTableRow('שכר לפיצויים:', formatCurrency(monthly.severance_gross_monthly));
        }
        if (monthly.kpg_employer_monthly !== null && monthly.kpg_employer_monthly !== undefined) {
          writeTableRow('קופ"ג מעסיק:', formatCurrency(monthly.kpg_employer_monthly));
        }
        if (monthly.kpg_gross_monthly !== null && monthly.kpg_gross_monthly !== undefined) {
          writeTableRow('שכר לקופ"ג:', formatCurrency(monthly.kpg_gross_monthly));
        }
        if (monthly.khs_employer_monthly !== null && monthly.khs_employer_monthly !== undefined) {
          writeTableRow('קה"ל מעסיק חודשי:', formatCurrency(monthly.khs_employer_monthly));
        }
        if (monthly.khs_gross_monthly !== null && monthly.khs_gross_monthly !== undefined) {
          writeTableRow('שכר לקה"ל:', formatCurrency(monthly.khs_gross_monthly));
        }
        if (monthly.city_tax_credit_month !== null && monthly.city_tax_credit_month !== undefined) {
          writeTableRow('הנחת ישוב:', formatCurrency(monthly.city_tax_credit_month));
        }
        if (monthly.seif_47_exempt_month !== null && monthly.seif_47_exempt_month !== undefined) {
          writeTableRow('פטור סעיף 47:', formatCurrency(monthly.seif_47_exempt_month));
        }
        if (monthly.shovi_monthly !== null && monthly.shovi_monthly !== undefined) {
          writeTableRow('שווי למס:', formatCurrency(monthly.shovi_monthly));
        }
      } else {
        doc.font('Helvetica').fontSize(11).text('אין נתונים זמינים', { align: 'right' });
      }
      
      // Yearly/Accumulated info - ALL fields - ALWAYS show section header
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(16).text('מידע שנתי/מצטבר', { align: 'right' });
      doc.moveDown(0.3);
      
      if (additionalData.yearly_accumulated_info) {
        const yearly = additionalData.yearly_accumulated_info;
        
        if (yearly.ytd_gross_payments !== null && yearly.ytd_gross_payments !== undefined) {
          writeTableRow('תשלומים:', formatCurrency(yearly.ytd_gross_payments));
        }
        if (yearly.ytd_shovi !== null && yearly.ytd_shovi !== undefined) {
          writeTableRow('שכר שווה כסף:', formatCurrency(yearly.ytd_shovi));
        }
        if (yearly.ytd_gross_for_tax !== null && yearly.ytd_gross_for_tax !== undefined) {
          writeTableRow('שכר חייב מס הכנסה:', formatCurrency(yearly.ytd_gross_for_tax));
        }
        if (yearly.ytd_tax !== null && yearly.ytd_tax !== undefined) {
          writeTableRow('מס הכנסה:', formatCurrency(yearly.ytd_tax));
        }
        if (yearly.ytd_bl_employee !== null && yearly.ytd_bl_employee !== undefined) {
          writeTableRow('ביטוח לאומי עובד:', formatCurrency(yearly.ytd_bl_employee));
        }
        if (yearly.ytd_bl_employer !== null && yearly.ytd_bl_employer !== undefined) {
          writeTableRow('ביטוח לאומי מעסיק:', formatCurrency(yearly.ytd_bl_employer));
        }
        if (yearly.ytd_health_employee !== null && yearly.ytd_health_employee !== undefined) {
          writeTableRow('ביטוח בריאות עובד:', formatCurrency(yearly.ytd_health_employee));
        }
        if (yearly.ytd_health_employer !== null && yearly.ytd_health_employer !== undefined) {
          writeTableRow('ביטוח בריאות מעסיק:', formatCurrency(yearly.ytd_health_employer));
        }
        if (yearly.ytd_35_tax_exempt !== null && yearly.ytd_35_tax_exempt !== undefined) {
          writeTableRow('גמול 35%:', formatCurrency(yearly.ytd_35_tax_exempt));
        }
        if (yearly.ytd_khs_employer !== null && yearly.ytd_khs_employer !== undefined) {
          writeTableRow('קרן השתלמות מעסיק:', formatCurrency(yearly.ytd_khs_employer));
        }
        if (yearly.ytd_khs_employee !== null && yearly.ytd_khs_employee !== undefined) {
          writeTableRow('קרן השתלמות עובד:', formatCurrency(yearly.ytd_khs_employee));
        }
        if (yearly.ytd_47_tax_deduction !== null && yearly.ytd_47_tax_deduction !== undefined) {
          writeTableRow('ניכוי סעיף 47:', formatCurrency(yearly.ytd_47_tax_deduction));
        }
        if (yearly.ytd_pension_employer !== null && yearly.ytd_pension_employer !== undefined) {
          writeTableRow('קופ"ג מעסיק:', formatCurrency(yearly.ytd_pension_employer));
        }
        if (yearly.ytd_pension_employee !== null && yearly.ytd_pension_employee !== undefined) {
          writeTableRow('קופ"ג עובד:', formatCurrency(yearly.ytd_pension_employee));
        }
        if (yearly.ytd_severance_employer !== null && yearly.ytd_severance_employer !== undefined) {
          writeTableRow('פיצויים מעסיק:', formatCurrency(yearly.ytd_severance_employer));
        }
        if (yearly.ytd_credit_points_amount !== null && yearly.ytd_credit_points_amount !== undefined) {
          writeTableRow('סכום נקודות זיכוי:', formatCurrency(yearly.ytd_credit_points_amount));
        }
        if (yearly.ytd_city_tax_credit !== null && yearly.ytd_city_tax_credit !== undefined) {
          writeTableRow('זיכוי מס עירוני:', formatCurrency(yearly.ytd_city_tax_credit));
        }
        if (yearly.ytd_total_tax_credit !== null && yearly.ytd_total_tax_credit !== undefined) {
          writeTableRow('סה"כ זיכוי מס:', formatCurrency(yearly.ytd_total_tax_credit));
        }
      } else {
        doc.font('Helvetica').fontSize(11).text('אין נתונים זמינים', { align: 'right' });
      }
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        this.logger.warn(`[generatePayslipPDFWithPdfKit] Comprehensive PDF created with pdfkit, size: ${pdfBuffer.length} bytes`);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
    });
  }
}

