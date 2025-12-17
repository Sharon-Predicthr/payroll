"use client";

interface Balance {
  previous_balance: number;
  accrued: number;
  used: number;
  new_balance: number;
}

interface VacationSickBalancesProps {
  vacation: Balance;
  sick: Balance;
}

export function VacationSickBalances({ vacation, sick }: VacationSickBalancesProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("he-IL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(num);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">חופשה</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">יתרה קודמת</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatNumber(vacation.previous_balance)} ימים
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">נצבר</span>
            <span className="text-sm font-semibold text-green-600">
              +{formatNumber(vacation.accrued)} ימים
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">נוצל</span>
            <span className="text-sm font-semibold text-red-600">
              -{formatNumber(vacation.used)} ימים
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-900">יתרה חדשה</span>
            <span className="text-sm font-bold text-gray-900">
              {formatNumber(vacation.new_balance)} ימים
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">מחלה</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">יתרה קודמת</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatNumber(sick.previous_balance)} ימים
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">נצבר</span>
            <span className="text-sm font-semibold text-green-600">
              +{formatNumber(sick.accrued)} ימים
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">נוצל</span>
            <span className="text-sm font-semibold text-red-600">
              -{formatNumber(sick.used)} ימים
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-900">יתרה חדשה</span>
            <span className="text-sm font-bold text-gray-900">
              {formatNumber(sick.new_balance)} ימים
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

