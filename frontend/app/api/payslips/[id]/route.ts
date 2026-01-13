import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const backendUrlClean = backendUrl.replace(/\/api$/, '');
    
    const response = await fetch(`${backendUrlClean}/payslips/${params.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Failed to fetch payslip' },
        { status: response.status }
      );
    }

    // Log additional_data for debugging
    if (data?.data?.additional_data) {
      console.log('[API /payslips/[id]] Additional data received:', JSON.stringify(data.data.additional_data, null, 2));
      console.log('[API /payslips/[id]] Yearly accumulated info keys:', Object.keys(data.data.additional_data.yearly_accumulated_info || {}).join(', '));
    } else {
      console.log('[API /payslips/[id]] No additional_data in response');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

