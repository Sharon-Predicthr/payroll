import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PdfGeneratorHtmlTemplate2Service {
  private readonly logger = new Logger(PdfGeneratorHtmlTemplate2Service.name);

  /**
   * Format additional data rows for employee data section
   */
  private formatAdditionalDataRowsForEmployee(payslipData: any, attendance: any, totals: any): string {
    try {
      const formatCurrency = (amount: number): string => {
        if (amount === null || amount === undefined) return '0.00';
        const numAmount = Number(amount);
        if (isNaN(numAmount)) return '0.00';
        return new Intl.NumberFormat('he-IL', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numAmount);
      };

      const empData = payslipData?.additional_data?.employee_data || {};
    const fields: Array<{key: string; label: string; value: any; isNumber?: boolean; isCurrency?: boolean; isPercentage?: boolean}> = [];
    
    // Default employee fields
    fields.push(
      { key: 'work_days_in_company', label: 'י"ע בחברה', value: empData.work_days_in_company ?? attendance.work_days ?? 0, isNumber: true },
      { key: 'work_hours_in_company', label: 'ש"ע בחברה', value: empData.work_hours_in_company ?? attendance.work_hours ?? 0, isNumber: true },
      { key: 'salary_taxable', label: 'שכר ח"ב מס', value: empData.salary_taxable ?? totals.taxable_salary ?? 0, isCurrency: true },
      { key: 'salary_national_insurance', label: 'שכר ב.לאומי', value: empData.salary_national_insurance ?? totals.insured_salary ?? 0, isCurrency: true },
      { key: 'salary_insured', label: 'שכר מבוטח', value: empData.salary_insured ?? totals.insured_salary ?? 0, isCurrency: true },
      { key: 'base_hourly_rate', label: 'בסיס קרה"ש', value: empData.base_hourly_rate ?? ((totals.taxable_salary ?? 0) / (attendance.work_hours ?? 1)), isCurrency: true },
      { key: 'national_insurance_base', label: 'ב.לאומי מצפיק', value: empData.national_insurance_base ?? totals.insured_salary ?? 0, isCurrency: true },
      { key: 'monthly_minimum_salary', label: 'שכר מינ.חודש', value: empData.monthly_minimum_salary ?? totals.insured_salary ?? 0, isCurrency: true },
      { key: 'hourly_minimum_salary', label: 'שכר מינ.שעה', value: empData.hourly_minimum_salary ?? ((totals.insured_salary ?? 0) / (attendance.work_hours ?? 1)), isCurrency: true },
    );
    
    // Add any additional custom fields from employee_data
    Object.keys(empData).forEach(key => {
      if (!fields.find(f => f.key === key)) {
        fields.push({
          key,
          label: key,
          value: empData[key],
          isNumber: typeof empData[key] === 'number',
          isCurrency: typeof empData[key] === 'number'
        });
      }
    });
    
    // Add custom fields if they exist
    if (payslipData.additional_data?.custom_fields) {
      payslipData.additional_data.custom_fields
        .filter((f: any) => !f.category || f.category === 'employee')
        .forEach((field: any) => {
          fields.push({
            key: field.label,
            label: field.label,
            value: field.value,
            isNumber: typeof field.value === 'number',
            isCurrency: typeof field.value === 'number'
          });
        });
    }

    return fields.map(field => {
      let displayValue: string;
      if (field.isPercentage) {
        displayValue = `${Number(field.value).toFixed(2)}%`;
      } else if (field.isCurrency) {
        displayValue = formatCurrency(field.value);
      } else if (field.isNumber) {
        displayValue = Number(field.value).toFixed(2);
      } else {
        displayValue = field.value?.toString() || '';
      }

      return `<div class="additional-data-row">
        <span>${field.label || ''}</span>
        <span>${displayValue || ''}</span>
      </div>`;
    }).join('') || '<div class="additional-data-row"><span>אין נתונים נוספים</span></div>';
    } catch (error) {
      this.logger.error(`[formatAdditionalDataRowsForEmployee] Error: ${error.message}`, error.stack);
      return '';
    }
  }

  /**
   * Format general information section
   */
  private formatGeneralInformationRows(payslipData: any): string {
    try {
      const formatCurrency = (amount: number): string => {
        if (amount === null || amount === undefined) return '0.00';
        const numAmount = Number(amount);
        if (isNaN(numAmount)) return '0.00';
        return new Intl.NumberFormat('he-IL', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numAmount);
      };

      const formatDate = (dateString: string): string => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
          return '';
        }
      };

      const genInfo = payslipData?.additional_data?.general_info || {};
    const fields: Array<{key: string; label: string; value: any; isNumber?: boolean; isCurrency?: boolean; isPercentage?: boolean; isDate?: boolean}> = [];
    
    // General Information fields
    if (genInfo.department_number !== undefined) {
      fields.push({ key: 'department_number', label: 'מחלקה', value: genInfo.department_number || '', isNumber: false });
    }
    if (genInfo.department_name !== undefined) {
      fields.push({ key: 'department_name', label: 'תיאור מחלקה', value: genInfo.department_name || '', isNumber: false });
    }
    if (genInfo.employee_address !== undefined) {
      fields.push({ key: 'employee_address', label: 'כתובת', value: genInfo.employee_address || '', isNumber: false });
    }
    if (genInfo.employee_national_id !== undefined) {
      fields.push({ key: 'employee_national_id', label: 'ת.ז.', value: genInfo.employee_national_id || '', isNumber: false });
    }
    if (genInfo.tariff_monthly !== undefined) {
      fields.push({ key: 'tariff_monthly', label: 'תעריף חודשי', value: genInfo.tariff_monthly || 0, isCurrency: true });
    }
    if (genInfo.tariff_daily !== undefined) {
      fields.push({ key: 'tariff_daily', label: 'תעריף יומי', value: genInfo.tariff_daily || 0, isCurrency: true });
    }
    if (genInfo.tariff_hourly !== undefined) {
      fields.push({ key: 'tariff_hourly', label: 'תעריף שעתי', value: genInfo.tariff_hourly || 0, isCurrency: true });
    }
    if (genInfo.standard_hours_per_month !== undefined) {
      fields.push({ key: 'standard_hours_per_month', label: 'שעות עבודה בחודש', value: genInfo.standard_hours_per_month || 0, isNumber: true });
    }
    if (genInfo.start_of_work !== undefined) {
      fields.push({ key: 'start_of_work', label: 'תחילת עבודה', value: genInfo.start_of_work || '', isDate: true });
    }
    if (genInfo.seniority_years !== undefined) {
      fields.push({ key: 'seniority_years', label: 'שנות ותק', value: genInfo.seniority_years || 0, isNumber: true });
    }
    if (genInfo.seniority_months !== undefined) {
      fields.push({ key: 'seniority_months', label: 'חודשי ותק', value: genInfo.seniority_months || 0, isNumber: true });
    }
    if (genInfo.job_pct !== undefined) {
      fields.push({ key: 'job_pct', label: 'אחוז משרה', value: genInfo.job_pct || 0, isPercentage: true });
    }
    if (genInfo.partial_period_pct !== undefined) {
      fields.push({ key: 'partial_period_pct', label: 'שיעור תשלום', value: genInfo.partial_period_pct || 0, isPercentage: true });
    }
    if (genInfo.tax_credit_points !== undefined) {
      fields.push({ key: 'tax_credit_points', label: 'נקודות זיכוי', value: genInfo.tax_credit_points || 0, isNumber: true });
    }
    if (genInfo.tax_pct_level !== undefined) {
      fields.push({ key: 'tax_pct_level', label: 'אחוז מס שולי', value: genInfo.tax_pct_level || 0, isPercentage: true });
    }
    if (genInfo.ytd_months_of_work !== undefined) {
      fields.push({ key: 'ytd_months_of_work', label: 'חודשי עבודה', value: genInfo.ytd_months_of_work || 0, isNumber: true });
    }
    if (genInfo.employer_tax_file_number !== undefined) {
      fields.push({ key: 'employer_tax_file_number', label: 'תיק ניכויים מעסיק', value: genInfo.employer_tax_file_number || '', isNumber: false });
    }
    if (genInfo.employer_national_insurance_number !== undefined) {
      fields.push({ key: 'employer_national_insurance_number', label: 'מספר מעסיק ב.ל.', value: genInfo.employer_national_insurance_number || '', isNumber: false });
    }
    if (genInfo.bank_code !== undefined) {
      fields.push({ key: 'bank_code', label: 'קוד בנק', value: genInfo.bank_code || '', isNumber: false });
    }
    if (genInfo.branch_code !== undefined) {
      fields.push({ key: 'branch_code', label: 'קוד סניף', value: genInfo.branch_code || '', isNumber: false });
    }
    if (genInfo.account_number !== undefined) {
      fields.push({ key: 'account_number', label: 'מספר חשבון', value: genInfo.account_number || '', isNumber: false });
    }

    return fields.map(field => {
      let displayValue: string;
      if (field.isDate) {
        displayValue = formatDate(field.value);
      } else if (field.isPercentage) {
        displayValue = `${Number(field.value).toFixed(2)}%`;
      } else if (field.isCurrency) {
        displayValue = formatCurrency(field.value);
      } else if (field.isNumber) {
        displayValue = Number(field.value).toFixed(2);
      } else {
        displayValue = field.value?.toString() || '';
      }

      return `<div class="additional-data-row">
        <span>${field.label || ''}</span>
        <span>${displayValue || ''}</span>
      </div>`;
    }).join('') || '';
    } catch (error) {
      this.logger.error(`[formatGeneralInformationRows] Error: ${error.message}`, error.stack);
      return '';
    }
  }

  /**
   * Format monthly tax information section
   */
  private formatMonthlyTaxInformationRows(payslipData: any): string {
    try {
      const formatCurrency = (amount: number): string => {
        if (amount === null || amount === undefined) return '0.00';
        const numAmount = Number(amount);
        if (isNaN(numAmount)) return '0.00';
        return new Intl.NumberFormat('he-IL', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numAmount);
      };

      const monthlyTax = payslipData?.additional_data?.monthly_tax_info || {};
    const fields: Array<{key: string; label: string; value: any; isNumber?: boolean; isCurrency?: boolean; isPercentage?: boolean}> = [];
    
    if (monthlyTax.tax_credit_points !== undefined) {
      fields.push({ key: 'tax_credit_points', label: 'נקודות זיכוי', value: monthlyTax.tax_credit_points || 0, isNumber: true });
    }
    if (monthlyTax.tax_pct_level !== undefined) {
      fields.push({ key: 'tax_pct_level', label: 'אחוז מס שולי', value: monthlyTax.tax_pct_level || 0, isPercentage: true });
    }
    if (monthlyTax.severance_monthly !== undefined) {
      fields.push({ key: 'severance_monthly', label: 'פיצויים חודשי', value: monthlyTax.severance_monthly || 0, isCurrency: true });
    }
    if (monthlyTax.severance_gross_monthly !== undefined) {
      fields.push({ key: 'severance_gross_monthly', label: 'שכר לפיצויים', value: monthlyTax.severance_gross_monthly || 0, isCurrency: true });
    }
    if (monthlyTax.kpg_employer_monthly !== undefined) {
      fields.push({ key: 'kpg_employer_monthly', label: 'קופ"ג מעסיק', value: monthlyTax.kpg_employer_monthly || 0, isCurrency: true });
    }
    if (monthlyTax.kpg_gross_monthly !== undefined) {
      fields.push({ key: 'kpg_gross_monthly', label: 'שכר לקופ"ג', value: monthlyTax.kpg_gross_monthly || 0, isCurrency: true });
    }
    if (monthlyTax.khs_employer_monthly !== undefined) {
      fields.push({ key: 'khs_employer_monthly', label: 'קה"ל מעסיק חודשי', value: monthlyTax.khs_employer_monthly || 0, isCurrency: true });
    }
    if (monthlyTax.khs_gross_monthly !== undefined) {
      fields.push({ key: 'khs_gross_monthly', label: 'שכר לקה"ל', value: monthlyTax.khs_gross_monthly || 0, isCurrency: true });
    }
    if (monthlyTax.city_tax_credit_month !== undefined) {
      fields.push({ key: 'city_tax_credit_month', label: 'הנחת ישוב', value: monthlyTax.city_tax_credit_month || 0, isCurrency: true });
    }
    if (monthlyTax.seif_47_exempt_month !== undefined) {
      fields.push({ key: 'seif_47_exempt_month', label: 'פטור סעיף 47', value: monthlyTax.seif_47_exempt_month || 0, isCurrency: true });
    }
    if (monthlyTax.shovi_monthly !== undefined) {
      fields.push({ key: 'shovi_monthly', label: 'שווי למס', value: monthlyTax.shovi_monthly || 0, isCurrency: true });
    }

    return fields.map(field => {
      let displayValue: string;
      if (field.isPercentage) {
        displayValue = `${Number(field.value).toFixed(2)}%`;
      } else if (field.isCurrency) {
        displayValue = formatCurrency(field.value);
      } else if (field.isNumber) {
        displayValue = Number(field.value).toFixed(2);
      } else {
        displayValue = field.value?.toString() || '';
      }

      return `<div class="additional-data-row">
        <span>${field.label || ''}</span>
        <span>${displayValue || ''}</span>
      </div>`;
    }).join('') || '';
    } catch (error) {
      this.logger.error(`[formatMonthlyTaxInformationRows] Error: ${error.message}`, error.stack);
      return '';
    }
  }

  /**
   * Format yearly/accumulated information section
   */
  private formatYearlyAccumulatedInformationRows(payslipData: any): string {
    try {
      const formatCurrency = (amount: number): string => {
        if (amount === null || amount === undefined) return '0.00';
        const numAmount = Number(amount);
        if (isNaN(numAmount)) return '0.00';
        return new Intl.NumberFormat('he-IL', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numAmount);
      };

      const yearlyInfo = payslipData?.additional_data?.yearly_accumulated_info || {};
      this.logger.log(`[formatYearlyAccumulatedInformationRows] Yearly info received:`, JSON.stringify(yearlyInfo, null, 2));
      this.logger.log(`[formatYearlyAccumulatedInformationRows] Yearly info keys: ${Object.keys(yearlyInfo).join(', ')}`);
      
      // Define all fields that should be displayed (in order from the specification)
      // Always show all fields, even if value is null or 0
      const allFields: Array<{key: string; label: string; value: any; isCurrency?: boolean}> = [
        { key: 'ytd_gross_payments', label: 'תשלומים', value: yearlyInfo.ytd_gross_payments ?? null, isCurrency: true },
        { key: 'ytd_shovi', label: 'שכר שווה כסף', value: yearlyInfo.ytd_shovi ?? null, isCurrency: true },
        { key: 'ytd_gross_for_tax', label: 'שכר חייב מס הכנסה', value: yearlyInfo.ytd_gross_for_tax ?? null, isCurrency: true },
        { key: 'ytd_tax', label: 'מס הכנסה', value: yearlyInfo.ytd_tax ?? null, isCurrency: true },
        { key: 'ytd_bl_employee', label: 'ביטוח לאומי עובד', value: yearlyInfo.ytd_bl_employee ?? null, isCurrency: true },
        { key: 'ytd_bl_employer', label: 'ביטוח לאומי מעסיק', value: yearlyInfo.ytd_bl_employer ?? null, isCurrency: true },
        { key: 'ytd_health_employee', label: 'ביטוח בריאות עובד', value: yearlyInfo.ytd_health_employee ?? null, isCurrency: true },
        { key: 'ytd_health_employer', label: 'ביטוח בריאות מעסיק', value: yearlyInfo.ytd_health_employer ?? null, isCurrency: true },
        { key: 'ytd_35_tax_exempt', label: 'גמול 35%', value: yearlyInfo.ytd_35_tax_exempt ?? null, isCurrency: true },
        { key: 'ytd_khs_employer', label: 'קרן השתלמות מעסיק', value: yearlyInfo.ytd_khs_employer ?? null, isCurrency: true },
        { key: 'ytd_khs_employee', label: 'קרן השתלמות עובד', value: yearlyInfo.ytd_khs_employee ?? null, isCurrency: true },
        { key: 'ytd_47_tax_deduction', label: 'ניכוי סעיף 47', value: yearlyInfo.ytd_47_tax_deduction ?? null, isCurrency: true },
        { key: 'ytd_pension_employer', label: 'קופ"ג מעסיק', value: yearlyInfo.ytd_pension_employer ?? null, isCurrency: true },
        { key: 'ytd_pension_employee', label: 'קופ"ג עובד', value: yearlyInfo.ytd_pension_employee ?? null, isCurrency: true },
        { key: 'ytd_severance_employer', label: 'פיצויים מעסיק', value: yearlyInfo.ytd_severance_employer ?? null, isCurrency: true },
        // Additional fields that might exist
        { key: 'ytd_credit_points_amount', label: 'סכום נקודות זיכוי', value: yearlyInfo.ytd_credit_points_amount ?? null, isCurrency: true },
        { key: 'ytd_city_tax_credit', label: 'זיכוי מס עירוני', value: yearlyInfo.ytd_city_tax_credit ?? null, isCurrency: true },
        { key: 'ytd_total_tax_credit', label: 'סה"כ זיכוי מס', value: yearlyInfo.ytd_total_tax_credit ?? null, isCurrency: true },
      ];
      
      // Always show all fields - even if values are null/0
      // This ensures all specified fields are displayed
      const fields = allFields;
      
      this.logger.log(`[formatYearlyAccumulatedInformationRows] Total fields to display: ${fields.length}`);
      this.logger.log(`[formatYearlyAccumulatedInformationRows] Fields with values: ${fields.filter(f => f.value !== null && f.value !== undefined).length}`);

    return fields.map(field => {
      const displayValue = field.isCurrency ? formatCurrency(field.value) : field.value?.toString() || '';
      return `<div class="additional-data-row">
        <span>${field.label || ''}</span>
        <span>${displayValue || ''}</span>
      </div>`;
    }).join('') || '';
    } catch (error) {
      this.logger.error(`[formatYearlyAccumulatedInformationRows] Error: ${error.message}`, error.stack);
      return '';
    }
  }

  /**
   * Format additional data rows for direct data section
   */
  private formatAdditionalDataRowsForDirect(payslipData: any, attendance: any, totals: any, employee: any): string {
    try {
      const formatCurrency = (amount: number): string => {
        if (amount === null || amount === undefined) return '0.00';
        const numAmount = Number(amount);
        if (isNaN(numAmount)) return '0.00';
        return new Intl.NumberFormat('he-IL', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numAmount);
      };

      const dirData = payslipData?.additional_data?.direct_data || {};
    const fields: Array<{key: string; label: string; value: any; isNumber?: boolean; isCurrency?: boolean; isPercentage?: boolean}> = [];
    
    // Default direct fields
    fields.push(
      { key: 'direct_work_days', label: 'ישר עבודה', value: dirData.direct_work_days ?? attendance.work_days ?? 0, isNumber: true },
      { key: 'direct_work_hours', label: 'שעות עבודה', value: dirData.direct_work_hours ?? attendance.work_hours ?? 0, isNumber: true },
      { key: 'direct_work_hours_attested', label: 'שעות העדויות', value: dirData.direct_work_hours_attested ?? attendance.work_hours ?? 0, isNumber: true },
      { key: 'hours_per_day', label: 'שעות ליום', value: dirData.hours_per_day ?? ((attendance.work_hours ?? 0) / (attendance.work_days ?? 1)), isNumber: true },
      { key: 'regular_credit_points', label: 'נק. רגילות', value: dirData.regular_credit_points ?? totals.credit_points ?? 0, isNumber: true },
      { key: 'marginal_tax_percentage', label: 'אחוז מס שולי', value: dirData.marginal_tax_percentage ?? totals.tax_percentage ?? 0, isPercentage: true },
      { key: 'version_code', label: 'קוד מהדורה', value: dirData.version_code ?? payslipData.payslip.version ?? '1.0', isNumber: false },
      { key: 'cumulative_calculation', label: 'חישוב מצטבר', value: dirData.cumulative_calculation ?? 'כן', isNumber: false },
      { key: 'payment_method', label: 'אופן תשלום', value: dirData.payment_method ?? (employee.bank_name ? 'העברה בנקאית' : 'מזומן'), isNumber: false },
    );
    
    // Add any additional custom fields from direct_data
    Object.keys(dirData).forEach(key => {
      if (!fields.find(f => f.key === key)) {
        fields.push({
          key,
          label: key,
          value: dirData[key],
          isNumber: typeof dirData[key] === 'number',
          isCurrency: false,
          isPercentage: false
        });
      }
    });
    
    // Add custom fields if they exist
    if (payslipData.additional_data?.custom_fields) {
      payslipData.additional_data.custom_fields
        .filter((f: any) => f.category === 'direct')
        .forEach((field: any) => {
          fields.push({
            key: field.label,
            label: field.label,
            value: field.value,
            isNumber: typeof field.value === 'number',
            isCurrency: false,
            isPercentage: false
          });
        });
    }

    return fields.map(field => {
      let displayValue: string;
      if (field.isPercentage) {
        displayValue = `${Number(field.value).toFixed(2)}%`;
      } else if (field.isCurrency) {
        displayValue = formatCurrency(field.value);
      } else if (field.isNumber) {
        displayValue = Number(field.value).toFixed(2);
      } else {
        displayValue = field.value?.toString() || '';
      }

      return `<div class="additional-data-row">
        <span>${field.label || ''}</span>
        <span>${displayValue || ''}</span>
      </div>`;
    }).join('') || '<div class="additional-data-row"><span>אין נתונים נוספים</span></div>';
    } catch (error) {
      this.logger.error(`[formatAdditionalDataRowsForDirect] Error: ${error.message}`, error.stack);
      return '';
    }
  }

  /**
   * Build additional data sections HTML
   */
  private buildAdditionalDataSectionsHTML(payslipData: any, attendance: any, totals: any, employee: any): string {
    try {
      const hasGeneralInfo = payslipData.additional_data?.general_info && Object.keys(payslipData.additional_data.general_info).length > 0;
      const hasMonthlyTax = payslipData.additional_data?.monthly_tax_info && Object.keys(payslipData.additional_data.monthly_tax_info).length > 0;
      const hasYearlyInfo = payslipData.additional_data?.yearly_accumulated_info && Object.keys(payslipData.additional_data.yearly_accumulated_info).length > 0;
      const hasOldEmployeeData = payslipData.additional_data?.employee_data && Object.keys(payslipData.additional_data.employee_data).length > 0;
      const hasOldDirectData = payslipData.additional_data?.direct_data && Object.keys(payslipData.additional_data.direct_data).length > 0;
      
      if (!hasGeneralInfo && !hasMonthlyTax && !hasYearlyInfo && !hasOldEmployeeData && !hasOldDirectData) {
        return '';
      }

      let html = '<div class="additional-data">';
      
      if (hasGeneralInfo) {
        try {
          const generalInfoHTML = this.formatGeneralInformationRows(payslipData);
          html += `
    <!-- General Information -->
    <div class="additional-data-section">
      <div class="additional-data-box" style="margin-bottom: 10px;">
        <div class="additional-data-title">מידע כללי</div>
        ${generalInfoHTML}
      </div>
    </div>`;
        } catch (error) {
          this.logger.warn(`[buildAdditionalDataSectionsHTML] Error formatting general info: ${error.message}`);
        }
      }
      
      if (hasMonthlyTax) {
        try {
          const monthlyTaxHTML = this.formatMonthlyTaxInformationRows(payslipData);
          html += `
    <!-- Monthly Tax Information -->
    <div class="additional-data-section">
      <div class="additional-data-box" style="margin-bottom: 10px;">
        <div class="additional-data-title">מידע מס חודשי</div>
        ${monthlyTaxHTML}
      </div>
    </div>`;
        } catch (error) {
          this.logger.warn(`[buildAdditionalDataSectionsHTML] Error formatting monthly tax info: ${error.message}`);
        }
      }
      
      if (hasYearlyInfo) {
        try {
          const yearlyInfoHTML = this.formatYearlyAccumulatedInformationRows(payslipData);
          html += `
    <!-- Yearly/Accumulated Information -->
    <div class="additional-data-section">
      <div class="additional-data-box" style="margin-bottom: 10px;">
        <div class="additional-data-title">מידע שנתי/מצטבר</div>
        ${yearlyInfoHTML}
      </div>
    </div>`;
        } catch (error) {
          this.logger.warn(`[buildAdditionalDataSectionsHTML] Error formatting yearly info: ${error.message}`);
        }
      }
      
      if (hasOldEmployeeData || hasOldDirectData) {
        html += `
    <!-- Legacy Additional Data (for backward compatibility) -->
    <div class="additional-data-grid">`;
        
        if (hasOldEmployeeData) {
          try {
            const employeeDataHTML = this.formatAdditionalDataRowsForEmployee(payslipData, attendance, totals);
            html += `
      <div class="additional-data-box">
        <div class="additional-data-title">נתונים עובדים</div>
        ${employeeDataHTML}
      </div>`;
          } catch (error) {
            this.logger.warn(`[buildAdditionalDataSectionsHTML] Error formatting employee data: ${error.message}`);
          }
        }
        
        if (hasOldDirectData) {
          try {
            const directDataHTML = this.formatAdditionalDataRowsForDirect(payslipData, attendance, totals, employee);
            html += `
      <div class="additional-data-box">
        <div class="additional-data-title">נתונים ישירים</div>
        ${directDataHTML}
      </div>`;
          } catch (error) {
            this.logger.warn(`[buildAdditionalDataSectionsHTML] Error formatting direct data: ${error.message}`);
          }
        }
        
        html += `
    </div>`;
      }
      
      html += '</div>';
      return html;
    } catch (error) {
      this.logger.error(`[buildAdditionalDataSectionsHTML] Error building additional data sections: ${error.message}`, error.stack);
      return ''; // Return empty string on error to prevent breaking the payslip
    }
  }

  /**
   * Generate HTML template for payslip - Template 2 (Israeli Standard Format)
   * Based on the provided PDF example
   */
  private generatePayslipHTML(payslipData: any): string {
    try {
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
    .additional-data-section {
      margin: 10px 0;
    }
    .additional-data-3-columns {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
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
      ${this.buildAdditionalDataSectionsHTML(payslipData, attendance, totals, employee)}

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
    } catch (error: any) {
      this.logger.error(`[generatePayslipHTML] Error generating HTML: ${error.message}`, error.stack);
      // Return minimal HTML with error message
      return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>שגיאה ביצירת תלוש</title>
</head>
<body>
  <h1>שגיאה ביצירת תלוש שכר</h1>
  <p>${error.message}</p>
</body>
</html>`;
    }
  }

  /**
   * Generate PDF using Puppeteer
   */
  public async generatePayslipPDF(payslipData: any): Promise<Buffer> {
    try {
      const puppeteer = require('puppeteer');
      
      this.logger.log('Starting PDF generation with Puppeteer (Template 2)');
      
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      });
      
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);
      
      let html: string;
      try {
        html = this.generatePayslipHTML(payslipData);
      } catch (error: any) {
        this.logger.error(`[generatePayslipPDF] Failed to generate HTML: ${error.message}`, error.stack);
        throw new Error(`Failed to generate payslip HTML: ${error.message}`);
      }
      
      // Log HTML length for debugging
      this.logger.log(`[generatePayslipPDF] Generated HTML length: ${html?.length || 0} characters`);
      if (!html || html.length < 1000) {
        this.logger.error(`[generatePayslipPDF] ERROR: HTML is too short (${html?.length || 0} chars), might be empty or corrupted`);
        this.logger.error(`[generatePayslipPDF] HTML preview (first 500 chars): ${html?.substring(0, 500) || 'HTML is null/undefined'}`);
        throw new Error(`Generated HTML is too short or empty (${html?.length || 0} characters)`);
      }
      
      // Set content with explicit encoding
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });
      
      // Wait for fonts and styles to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify page has content
      const bodyText = await page.evaluate(() => document.body?.innerText || '');
      this.logger.log(`[generatePayslipPDF] Page body text length: ${bodyText.length} characters`);
      if (bodyText.length < 100) {
        this.logger.warn(`[generatePayslipPDF] WARNING: Page body seems empty or very short`);
        this.logger.warn(`[generatePayslipPDF] Body text preview: ${bodyText.substring(0, 200)}`);
      }
      
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
      
      // Verify PDF is not empty
      if (!pdfBuffer || pdfBuffer.length < 100) {
        this.logger.error(`[generatePayslipPDF] ERROR: Generated PDF is too small (${pdfBuffer?.length || 0} bytes), likely empty or corrupted`);
        throw new Error('Generated PDF is empty or corrupted');
      }
      
      return Buffer.from(pdfBuffer);
    } catch (error: any) {
      this.logger.error('PDF generation error with Puppeteer (Template 2):', error);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }
}

