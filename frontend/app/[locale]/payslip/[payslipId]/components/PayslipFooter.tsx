"use client";

interface PayslipFooterProps {
  generationDate: string;
  payslipId: string;
  version: string;
}

export function PayslipFooter({ generationDate, payslipId, version }: PayslipFooterProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
        <div>
          <span className="font-medium">תאריך יצירה: </span>
          <span>{formatDate(generationDate)}</span>
        </div>
        <div>
          <span className="font-medium">מספר תלוש: </span>
          <span className="font-mono">{payslipId}</span>
        </div>
        <div>
          <span className="font-medium">נוצר על ידי: </span>
          <span>PayLens</span>
        </div>
        <div>
          <span className="font-medium">גרסה: </span>
          <span className="font-mono">{version}</span>
        </div>
      </div>
    </div>
  );
}

