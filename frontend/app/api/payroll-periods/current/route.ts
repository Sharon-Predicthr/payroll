import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "לא מאומת" },
        { status: 401 }
      );
    }

    // Forward request to backend
    const backendUrl = `${BACKEND_URL}/payroll-periods/current`;
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          message: errorData.message || `Backend error: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[API /payroll-periods/current] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "שגיאה בטעינת תקופת השכר הנוכחית",
      },
      { status: 500 }
    );
  }
}

