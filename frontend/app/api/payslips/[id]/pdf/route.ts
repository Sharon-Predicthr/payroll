import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 14/15 compatibility)
    const resolvedParams = await Promise.resolve(params);
    const payslipId = resolvedParams.id;

    // Get auth header from request (passed from frontend)
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`[API Route /payslips/${payslipId}/pdf] Missing or invalid Authorization header`);
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const backendUrlClean = backendUrl.replace(/\/api$/, '');
    
    console.log(`[API Route /payslips/${payslipId}/pdf] Calling backend: ${backendUrlClean}/payslips/${payslipId}/pdf`);
    
    const response = await fetch(`${backendUrlClean}/payslips/${payslipId}/pdf`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[API Route /payslips/${payslipId}/pdf] Backend response status: ${response.status}`);

    if (!response.ok) {
      let errorMessage = 'Failed to generate PDF';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      console.error(`[API Route /payslips/${payslipId}/pdf] Backend error: ${errorMessage}`);
      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    console.log(`[API Route /payslips/${payslipId}/pdf] PDF blob size: ${blob.size} bytes`);
    
    // Get Content-Disposition header from backend (contains Hebrew filename)
    const contentDisposition = response.headers.get('Content-Disposition');
    const contentType = response.headers.get('Content-Type') || 'application/pdf';
    
    // Use backend's Content-Disposition if available, otherwise use fallback
    const headers: HeadersInit = {
      'Content-Type': contentType,
    };
    
    if (contentDisposition) {
      // Pass through the backend's Content-Disposition header (includes Hebrew filename)
      headers['Content-Disposition'] = contentDisposition;
      console.log(`[API Route /payslips/${payslipId}/pdf] Using backend filename: ${contentDisposition}`);
    } else {
      // Fallback if backend doesn't provide it
      headers['Content-Disposition'] = `attachment; filename=payslip-${payslipId}.pdf`;
    }
    
    return new NextResponse(blob, {
      headers,
    });
  } catch (error: any) {
    console.error('[API Route /payslips/[id]/pdf] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

