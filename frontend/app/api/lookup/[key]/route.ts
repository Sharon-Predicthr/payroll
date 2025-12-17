import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> | { key: string } }
) {
  let key: string | undefined;
  try {
    const resolvedParams = await Promise.resolve(params);
    key = resolvedParams.key;
    const body = await request.json();
    const { table, valueKey, labelKey, filter, search, searchFields } = body;

    // Get authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "לא מאומת" },
        { status: 401 }
      );
    }

    // Forward request to backend
    const backendUrl = `${BACKEND_URL}/lookup/${key}`;
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        table,
        valueKey,
        labelKey,
        filter,
        search,
        searchFields,
      }),
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
    console.error(`[API /lookup/${key || 'unknown'}] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "שגיאה בטעינת הנתונים",
      },
      { status: 500 }
    );
  }
}

