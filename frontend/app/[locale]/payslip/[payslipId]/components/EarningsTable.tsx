"use client";

interface EarningsItem {
  code: string;
  description: string;
  quantity: number;
  rate: number;
  taxable_value: number;
  amount: number;
  explanation?: string;
}

interface EarningsTableProps {
  earnings: EarningsItem[];
}

export function EarningsTable({ earnings }: EarningsTableProps) {
  const total = earnings.reduce((sum, item) => sum + item.amount, 0);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("he-IL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">תשלומים</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">קוד</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">תיאור</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">כמות</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">תעריף</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ערך חייב במס</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">סכום</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((item, index) => (
              <tr
                key={index}
                className="border-b border-gray-100 hover:bg-gray-50"
                title={item.explanation}
              >
                <td className="text-right py-3 px-4 text-sm text-gray-900">{item.code}</td>
                <td className="text-right py-3 px-4 text-sm text-gray-900">{item.description}</td>
                <td className="text-left py-3 px-4 text-sm text-gray-900 font-mono">
                  {item.quantity !== 0 ? formatNumber(item.quantity) : "-"}
                </td>
                <td className="text-left py-3 px-4 text-sm text-gray-900 font-mono">
                  {item.rate !== 0 ? formatNumber(item.rate) : "-"}
                </td>
                <td className="text-left py-3 px-4 text-sm text-gray-900 font-mono">
                  {item.taxable_value !== 0 ? formatNumber(item.taxable_value) : "-"}
                </td>
                <td className="text-left py-3 px-4 text-sm text-gray-900 font-semibold font-mono">
                  ₪{formatNumber(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300">
              <td colSpan={5} className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                סה״כ תשלומים
              </td>
              <td className="text-left py-3 px-4 text-sm font-bold text-gray-900 font-mono">
                ₪{formatNumber(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

