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
  downloadingPDF = false,
}: PayslipHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:shadow-none print:border-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            תלוש שכר – {month} {year}
          </h1>
          <p className="text-lg text-gray-600">
            {companyName || 'שם חברה לא זמין'} {companyRegistration ? `| ח.פ. ${companyRegistration}` : ''}
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
              disabled={downloadingPDF}
              className="flex items-center gap-2"
            >
              {downloadingPDF ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  מוריד...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  הורד PDF
                </>
              )}
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

