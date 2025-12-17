"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer, ArrowRight } from "lucide-react";

interface PayslipHeaderProps {
  month: string;
  year: number;
  companyName: string;
  companyRegistration: string;
  canDownloadPDF: boolean;
  onDownloadPDF: () => void;
  onPrint: () => void;
  onBack: () => void;
}

export function PayslipHeader({
  month,
  year,
  companyName,
  companyRegistration,
  canDownloadPDF,
  onDownloadPDF,
  onPrint,
  onBack,
}: PayslipHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:shadow-none print:border-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            תלוש שכר – {month} {year}
          </h1>
          <p className="text-lg text-gray-600">
            {companyName} | ח.פ. {companyRegistration}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה
          </Button>
          {canDownloadPDF && (
            <Button
              variant="outline"
              onClick={onDownloadPDF}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              הורד PDF
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onPrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            הדפס
          </Button>
        </div>
      </div>
    </div>
  );
}

