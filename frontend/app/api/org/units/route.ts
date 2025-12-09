import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    
    console.log('[API Route] POST /api/org/units - Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[API Route] Missing or invalid Authorization header');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    let backendUrlClean = backendUrl.replace(/\/api$/, '');
    // Ensure no trailing slash
    backendUrlClean = backendUrlClean.replace(/\/$/, '');
    const finalBackendUrl = `${backendUrlClean}/org/units`;
    
    const body = await request.json();
    console.log('[API Route] POST /api/org/units');
    console.log('[API Route] Backend URL:', finalBackendUrl);
    console.log('[API Route] Request body:', JSON.stringify(body, null, 2));

    const response = await fetch(finalBackendUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('[API Route] Backend response status:', response.status);

    const data = await response.json();
    console.log('[API Route] Backend response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[API Route] Backend error:', data);
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to create unit' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Error proxying create unit request:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

