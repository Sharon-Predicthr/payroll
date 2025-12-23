import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/payroll-periods`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    // Check if response is HTML (ngrok warning page or error)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[API /payroll-periods] Backend returned non-JSON response:', {
        status: response.status,
        contentType,
        url: `${BACKEND_URL}/payroll-periods`,
        preview: text.substring(0, 200),
      });
      throw new Error(`Backend returned ${contentType} instead of JSON. Check BACKEND_URL: ${BACKEND_URL}`);
    }

    const data = await response.json();
    
    console.log('[API /payroll-periods] Backend response status:', response.status);
    console.log('[API /payroll-periods] Backend response data:', data);

    if (!response.ok) {
      console.error('[API /payroll-periods] Backend error:', data);
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch payroll periods' },
        { status: response.status }
      );
    }

    console.log('[API /payroll-periods] Returning data to frontend:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching payroll periods:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/payroll-periods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    // Check if response is HTML (ngrok warning page or error)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[API /payroll-periods POST] Backend returned non-JSON response:', {
        status: response.status,
        contentType,
        url: `${BACKEND_URL}/payroll-periods`,
        preview: text.substring(0, 200),
      });
      throw new Error(`Backend returned ${contentType} instead of JSON. Check BACKEND_URL: ${BACKEND_URL}`);
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to create payroll period' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating payroll period:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
