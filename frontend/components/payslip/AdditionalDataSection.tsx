"use client";

interface AdditionalDataSectionProps {
  additionalData: {
    general_info?: { [key: string]: any };
    monthly_tax_info?: { [key: string]: any };
    yearly_accumulated_info?: { [key: string]: any };
    employee_data?: { [key: string]: any };
    direct_data?: { [key: string]: any };
    custom_fields?: Array<{ label: string; value: any; category?: string }>;
  };
}

function formatValue(value: any, isCurrency?: boolean, isPercentage?: boolean, isNumber?: boolean): string {
  if (value === null || value === undefined) return '';
  
  if (isPercentage) {
    return `${Number(value).toFixed(2)}%`;
  }
  
  if (isCurrency) {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  }
  
  if (isNumber) {
    return Number(value).toFixed(2);
  }
  
  if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
    // Date string
    try {
      const date = new Date(value);
      return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return value;
    }
  }
  
  return String(value);
}

function DataField({ label, value, isCurrency, isPercentage, isNumber }: { 
  label: string; 
  value: any; 
  isCurrency?: boolean; 
  isPercentage?: boolean; 
  isNumber?: boolean;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-gray-600 font-medium">{label}</span>
      <span className="text-gray-900 font-semibold">{formatValue(value, isCurrency, isPercentage, isNumber)}</span>
    </div>
  );
}

function DataBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">{title}</h3>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

export function AdditionalDataSection({ additionalData }: AdditionalDataSectionProps) {
  const hasGeneralInfo = additionalData.general_info && Object.keys(additionalData.general_info).length > 0;
  const hasMonthlyTax = additionalData.monthly_tax_info && Object.keys(additionalData.monthly_tax_info).length > 0;
  const hasYearlyInfo = additionalData.yearly_accumulated_info && Object.keys(additionalData.yearly_accumulated_info).length > 0;
  const hasEmployeeData = additionalData.employee_data && Object.keys(additionalData.employee_data).length > 0;
  const hasDirectData = additionalData.direct_data && Object.keys(additionalData.direct_data).length > 0;

  if (!hasGeneralInfo && !hasMonthlyTax && !hasYearlyInfo && !hasEmployeeData && !hasDirectData) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 border-b-2 border-gray-300 pb-2">תוספות מידע לתלוש</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasGeneralInfo && (
          <DataBox title="מידע כללי">
            {Object.entries(additionalData.general_info || {}).map(([key, value]) => {
              const isCurrency = typeof value === 'number' && (key.includes('tariff') || key.includes('salary') || key.includes('rate'));
              const isPercentage = typeof value === 'number' && (key.includes('pct') || key.includes('percentage'));
              const isNumber = typeof value === 'number';
              const label = key === 'department_number' ? 'מחלקה' :
                           key === 'department_name' ? 'תיאור מחלקה' :
                           key === 'employee_address' ? 'כתובת' :
                           key === 'employee_national_id' ? 'ת.ז.' :
                           key === 'tariff_monthly' ? 'תעריף חודשי' :
                           key === 'tariff_daily' ? 'תעריף יומי' :
                           key === 'tariff_hourly' ? 'תעריף שעתי' :
                           key === 'standard_hours_per_month' ? 'שעות עבודה בחודש' :
                           key === 'start_of_work' ? 'תחילת עבודה' :
                           key === 'seniority_years' ? 'שנות ותק' :
                           key === 'seniority_months' ? 'חודשי ותק' :
                           key === 'job_pct' ? 'אחוז משרה' :
                           key === 'partial_period_pct' ? 'שיעור תשלום' :
                           key === 'tax_credit_points' ? 'נקודות זיכוי' :
                           key === 'tax_pct_level' ? 'אחוז מס שולי' :
                           key === 'ytd_months_of_work' ? 'חודשי עבודה' :
                           key === 'employer_tax_file_number' ? 'תיק ניכויים מעסיק' :
                           key === 'employer_national_insurance_number' ? 'מספר מעסיק ב.ל.' :
                           key === 'bank_code' ? 'קוד בנק' :
                           key === 'branch_code' ? 'קוד סניף' :
                           key === 'account_number' ? 'מספר חשבון' : key;
              
              return (
                <DataField
                  key={key}
                  label={label}
                  value={value}
                  isCurrency={isCurrency}
                  isPercentage={isPercentage}
                  isNumber={isNumber}
                />
              );
            })}
          </DataBox>
        )}

        {hasMonthlyTax && (
          <DataBox title="מידע מס חודשי">
            {Object.entries(additionalData.monthly_tax_info || {}).map(([key, value]) => {
              const isCurrency = typeof value === 'number';
              const isPercentage = key.includes('pct') || key.includes('percentage');
              const label = key === 'tax_credit_points' ? 'נקודות זיכוי' :
                           key === 'tax_pct_level' ? 'אחוז מס שולי' :
                           key === 'severance_monthly' ? 'פיצויים חודשי' :
                           key === 'severance_gross_monthly' ? 'שכר לפיצויים' :
                           key === 'kpg_employer_monthly' ? 'קופ"ג מעסיק' :
                           key === 'kpg_gross_monthly' ? 'שכר לקופ"ג' :
                           key === 'khs_employer_monthly' ? 'קה"ל מעסיק חודשי' :
                           key === 'khs_gross_monthly' ? 'שכר לקה"ל' :
                           key === 'city_tax_credit_month' ? 'הנחת ישוב' :
                           key === 'seif_47_exempt_month' ? 'פטור סעיף 47' :
                           key === 'shovi_monthly' ? 'שווי למס' : key;
              
              return (
                <DataField
                  key={key}
                  label={label}
                  value={value}
                  isCurrency={isCurrency}
                  isPercentage={isPercentage}
                />
              );
            })}
          </DataBox>
        )}

        {hasYearlyInfo && (
          <DataBox title="מידע שנתי/מצטבר">
            {Object.entries(additionalData.yearly_accumulated_info || {}).map(([key, value]) => {
              const isCurrency = typeof value === 'number';
              const label = key === 'ytd_gross_payments' ? 'תשלומים' :
                           key === 'ytd_shovi' ? 'שכר שווה כסף' :
                           key === 'ytd_gross_for_tax' ? 'שכר חייב מס הכנסה' :
                           key === 'ytd_tax' ? 'מס הכנסה' :
                           key === 'ytd_bl_employee' ? 'ביטוח לאומי עובד' :
                           key === 'ytd_bl_employer' ? 'ביטוח לאומי מעסיק' :
                           key === 'ytd_health_employee' ? 'ביטוח בריאות עובד' :
                           key === 'ytd_health_employer' ? 'ביטוח בריאות מעסיק' :
                           key === 'ytd_35_tax_exempt' ? 'גמול 35%' :
                           key === 'ytd_khs_employer' ? 'קרן השתלמות מעסיק' :
                           key === 'ytd_khs_employee' ? 'קרן השתלמות עובד' :
                           key === 'ytd_47_tax_deduction' ? 'ניכוי סעיף 47' :
                           key === 'ytd_pension_employer' ? 'קופ"ג מעסיק' :
                           key === 'ytd_pension_employee' ? 'קופ"ג עובד' :
                           key === 'ytd_severance_employer' ? 'פיצויים מעסיק' : key;
              
              return (
                <DataField
                  key={key}
                  label={label}
                  value={value}
                  isCurrency={isCurrency}
                />
              );
            })}
          </DataBox>
        )}

        {hasEmployeeData && (
          <DataBox title="נתונים עובדים">
            {Object.entries(additionalData.employee_data || {}).map(([key, value]) => {
              const isCurrency = typeof value === 'number' && (key.includes('salary') || key.includes('rate') || key.includes('base'));
              const isNumber = typeof value === 'number';
              return (
                <DataField
                  key={key}
                  label={key}
                  value={value}
                  isCurrency={isCurrency}
                  isNumber={isNumber}
                />
              );
            })}
          </DataBox>
        )}

        {hasDirectData && (
          <DataBox title="נתונים ישירים">
            {Object.entries(additionalData.direct_data || {}).map(([key, value]) => {
              const isPercentage = typeof value === 'number' && key.includes('percentage');
              const isNumber = typeof value === 'number';
              return (
                <DataField
                  key={key}
                  label={key}
                  value={value}
                  isPercentage={isPercentage}
                  isNumber={isNumber}
                />
              );
            })}
          </DataBox>
        )}
      </div>
    </div>
  );
}



