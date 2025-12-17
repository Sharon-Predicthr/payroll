import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const employeeId = resolvedParams.id;
    const body = await request.json();

    // Get authorization header from request (passed from client)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "לא מאומת" },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/employees/${employeeId}/save-all`, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: result.message || `Backend error: ${response.status}`,
          error: result.error,
          operationLog: result.operationLog,
          details: result.details,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[API /employees/[id]/save-all] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "שגיאה בשמירת הנתונים",
      },
      { status: 500 }
    );
  }
}

