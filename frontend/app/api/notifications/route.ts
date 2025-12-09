import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    const backendUrl = `${BACKEND_URL}/notifications?limit=${limit}&offset=${offset}`;
    
    console.log('[API Route] Proxying to backend:', backendUrl);
    console.log('[API Route] Token present:', !!token);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    console.log('[API Route] Backend response status:', response.status);
    const data = await response.json();
    console.log('[API Route] Backend response data:', JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch notifications' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] Error proxying notifications request:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

