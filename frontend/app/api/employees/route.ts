import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    console.log('[API Route] Authorization header:', authHeader ? 'Present' : 'Missing');
    console.log('[API Route] All headers:', Object.fromEntries(request.headers.entries()));
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[API Route] Missing or invalid Authorization header');
      return NextResponse.json(
        { message: 'Not authenticated. Please log in again.' },
        { status: 401 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    let backendUrlClean = backendUrl.replace(/\/api$/, '');
    
    // Get pagination params from query string
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    
    const backendUrlWithParams = `${backendUrlClean}/employees?page=${page}&limit=${limit}`;
    console.log('[API Route] Calling backend:', backendUrlWithParams);
    
    const response = await fetch(backendUrlWithParams, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    console.log('[API Route] Backend response status:', response.status);
    console.log('[API Route] Backend response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('[API Route] Backend response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[API Route] Backend error:', data);
      return NextResponse.json(
        { message: data.message || 'Failed to fetch employees' },
        { status: response.status }
      );
    }

    console.log('[API Route] Success, returning data');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

