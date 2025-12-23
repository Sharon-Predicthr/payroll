"use client";

interface DeductionItem {
  description: string;
  amount: number;
}

interface DeductionsTableProps {
  deductions: DeductionItem[];
  title?: string;
  showTotal?: boolean;
}

export function DeductionsTable({ 
  deductions, 
  title = "ניכויים",
  showTotal = true 
}: DeductionsTableProps) {
  const total = deductions.reduce((sum, item) => sum + item.amount, 0);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("he-IL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (deductions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">תיאור</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">סכום</th>
            </tr>
          </thead>
          <tbody>
            {deductions.map((item, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="text-right py-3 px-4 text-sm text-gray-900">{item.description}</td>
                <td className="text-left py-3 px-4 text-sm text-gray-900 font-semibold font-mono">
                  ₪{formatNumber(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          {showTotal && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                  סה״כ {title}
                </td>
                <td className="text-left py-3 px-4 text-sm font-bold text-gray-900 font-mono">
                  ₪{formatNumber(total)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

