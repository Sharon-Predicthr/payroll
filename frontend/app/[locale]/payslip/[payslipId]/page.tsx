"use client";

import { useRouter, useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { isAuthenticated } from "@/lib/auth";
import { PayslipView } from "@/components/payslip/PayslipView";

export default function PayslipPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const payslipId = params.payslipId as string;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push(`/${locale}/login`);
    }
  }, [locale, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען תלוש שכר...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return null;
  }

  // Standalone payslip view without sidebar/topbar
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-6xl mx-auto py-6 px-4 print:px-0">
        <PayslipView
          payslipId={payslipId}
          mode="page"
          onBack={() => {
            // Try to close window (if opened by window.open)
            if (window.opener) {
              window.close();
            } else {
              // Fallback: navigate back or to payslips list
              router.push(`/${locale}/payslips`);
            }
          }}
          showActions={true}
        />
      </div>
    </div>
  );
}

