import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:4000';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    
    console.log('[API Route] GET /api/org/levels - Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[API Route] Missing or invalid Authorization header');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    let backendUrlClean = backendUrl.replace(/\/api$/, '');
    backendUrlClean = backendUrlClean.replace(/\/$/, '');
    const finalBackendUrl = `${backendUrlClean}/org/levels`;
    
    console.log('[API Route] Calling backend:', finalBackendUrl);

    const response = await fetch(finalBackendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('[API Route] Backend response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error('[API Route] Backend error:', data);
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch levels' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Error proxying org levels request:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    
    console.log('[API Route] POST /api/org/levels - Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[API Route] Missing or invalid Authorization header');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[API Route] Request body:', body);

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    let backendUrlClean = backendUrl.replace(/\/api$/, '');
    backendUrlClean = backendUrlClean.replace(/\/$/, '');
    const finalBackendUrl = `${backendUrlClean}/org/levels`;
    
    console.log('[API Route] Calling backend:', finalBackendUrl);

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

    if (!response.ok) {
      console.error('[API Route] Backend error:', data);
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to create level' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Error proxying create level request:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
