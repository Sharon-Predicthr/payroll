import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:4000';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[API Route] ===== GET /api/org/tree called =====');
    console.log('[API Route] Request URL:', request.url);
    
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    
    console.log('[API Route] Authorization header:', authHeader ? 'Present' : 'Missing');
    
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
    const finalBackendUrl = `${backendUrlClean}/org/tree`;
    
    console.log('[API Route] Backend URL env:', backendUrl);
    console.log('[API Route] Cleaned backend URL:', backendUrlClean);
    console.log('[API Route] Final backend URL:', finalBackendUrl);

    const response = await fetch(finalBackendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('[API Route] Backend response status:', response.status);
    console.log('[API Route] Backend response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API Route] Backend error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Failed to fetch tree' };
      }
      return NextResponse.json(
        { success: false, message: errorData.message || 'Failed to fetch tree' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[API Route] Backend response data (first 200 chars):', JSON.stringify(data).substring(0, 200));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Error proxying org tree request:', error);
    console.error('[API Route] Error stack:', error.stack);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

