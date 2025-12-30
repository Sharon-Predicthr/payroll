# מדריך לשדות נוספים בתלוש שכר

## סקירה כללית

נוספה תמיכה בשדות מידע נוספים בתלוש השכר, המאפשרת להוסיף שדות מותאמים אישית בקטע "תוספות מידע" של התלוש.

## מבנה הנתונים

השדות הנוספים מוגדרים ב-`PayslipAdditionalDataDto` וכוללים:

### 1. נתוני עובד (employee_data)
- ימי עבודה בחברה
- שעות עבודה בחברה
- שכר חייב במס
- שכר ביטוח לאומי
- שכר מבוטח
- בסיס קרה"ש (קרן השתלמות שעתית)
- ביטוח לאומי מצטבר
- שכר מינימום חודשי
- שכר מינימום שעתי

### 2. נתונים ישירים (direct_data)
- ימי עבודה ישירים
- שעות עבודה ישירות
- שעות עבודה מאומתות
- שעות ליום
- נקודות זיכוי רגילות
- אחוז מס שולי
- קוד מהדורה
- חישוב מצטבר
- אופן תשלום

### 3. שדות מותאמים אישית (custom_fields)
ניתן להוסיף שדות מותאמים אישית עם תווית וערך.

## דוגמה לשימוש

```typescript
const payslipData = {
  // ... נתונים קיימים ...
  additional_data: {
    employee_data: {
      work_days_in_company: 22,
      work_hours_in_company: 176,
      salary_taxable: 15000,
      salary_national_insurance: 12000,
      salary_insured: 12000,
      base_hourly_rate: 85.23,
      national_insurance_base: 12000,
      monthly_minimum_salary: 5500,
      hourly_minimum_salary: 31.25,
      // ניתן להוסיף שדות נוספים דינמיים
      custom_field_1: 'ערך מותאם אישית'
    },
    direct_data: {
      direct_work_days: 22,
      direct_work_hours: 176,
      direct_work_hours_attested: 176,
      hours_per_day: 8.0,
      regular_credit_points: 2.25,
      marginal_tax_percentage: 18.38,
      version_code: '1.0',
      cumulative_calculation: 'כן',
      payment_method: 'העברה בנקאית'
    },
    custom_fields: [
      {
        label: 'שדה מותאם אישית 1',
        value: 'ערך',
        category: 'employee' // או 'direct' או 'other'
      },
      {
        label: 'שדה מותאם אישית 2',
        value: 1234.56,
        category: 'direct'
      }
    ]
  }
};
```

## הוספת שדות חדשים

### דרך 1: באמצעות employee_data או direct_data
פשוט הוסף שדות חדשים לאובייקטים `employee_data` או `direct_data`. השדות יתצגו אוטומטית בקטע המתאים.

### דרך 2: באמצעות custom_fields
השתמש ב-`custom_fields` להוספת שדות עם תווית מותאמת אישית:

```typescript
custom_fields: [
  {
    label: 'שם השדה בעברית',
    value: 'ערך השדה',
    category: 'employee' // יוצג בקטע "נתונים עובדים"
  }
]
```

## עיצוב

השדות הנוספים מוצגים בשתי תיבות:
- **נתונים עובדים** - בצד ימין
- **נתונים ישירים** - בצד שמאל

העיצוב תואם לעיצוב הקיים של התלוש, עם:
- גופן עברי ברור
- פורמט מספרים בעברית (RTL)
- עיצוב מקצועי וקריא
- תמיכה בהדפסה

## סוגי נתונים נתמכים

- **מספרים** (`isNumber: true`) - מוצגים עם 2 מקומות עשרוניים
- **מטבע** (`isCurrency: true`) - מוצג בפורמט ₪X,XXX.XX
- **אחוזים** (`isPercentage: true`) - מוצגים עם סימן %
- **טקסט** - מוצג כמו שהוא

## תאימות לאחור

אם `additional_data` לא מסופק, המערכת תשתמש בערכי ברירת המחדל מהנתונים הקיימים (totals, attendance, וכו').



