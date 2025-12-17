"use client";

interface SummaryCardsProps {
  netSalary: number;
  taxableSalary: number;
  insuredSalary: number;
  taxPercentage: number;
  creditPoints: number;
  workDays: number;
  workHours: number;
  absenceDays: number;
}

export function SummaryCards({
  netSalary,
  taxableSalary,
  insuredSalary,
  taxPercentage,
  creditPoints,
  workDays,
  workHours,
  absenceDays,
}: SummaryCardsProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("he-IL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border-2 border-blue-200 p-6">
        <div className="text-center">
          <p className="text-sm font-medium text-blue-700 mb-2">שכר נטו</p>
          <p className="text-4xl font-bold text-blue-900">
            ₪{formatNumber(netSalary)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">נתוני מס</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">שכר חייב במס</span>
            <span className="text-sm font-semibold text-gray-900 font-mono">
              ₪{formatNumber(taxableSalary)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">שכר מבוטח</span>
            <span className="text-sm font-semibold text-gray-900 font-mono">
              ₪{formatNumber(insuredSalary)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">אחוז מס</span>
            <span className="text-sm font-semibold text-gray-900">
              {taxPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">נקודות זיכוי</span>
            <span className="text-sm font-semibold text-gray-900">
              {creditPoints}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">נוכחות</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">ימי עבודה</span>
            <span className="text-sm font-semibold text-gray-900">
              {workDays}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">שעות עבודה</span>
            <span className="text-sm font-semibold text-gray-900">
              {workHours}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">ימי היעדרות</span>
            <span className="text-sm font-semibold text-gray-900">
              {absenceDays}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

