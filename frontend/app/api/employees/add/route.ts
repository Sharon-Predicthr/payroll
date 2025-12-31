import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Not authenticated. Please log in again.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    let backendUrlClean = backendUrl.replace(/\/api$/, '');
    
    const backendUrlWithPath = `${backendUrlClean}/employees/add`;
    console.log('[API Route] Calling backend POST /employees/add:', backendUrlWithPath);
    console.log('[API Route] Request body:', JSON.stringify(body, null, 2));
    
    const response = await fetch(backendUrlWithPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    let data: any;
    try {
      const text = await response.text();
      if (!text) {
        console.error('[API Route] Empty response from backend');
        return NextResponse.json(
          { message: 'Empty response from server' },
          { status: response.status || 500 }
        );
      }
      data = JSON.parse(text);
    } catch (parseError: any) {
      console.error('[API Route] Error parsing response:', parseError);
      console.error('[API Route] Response status:', response.status);
      console.error('[API Route] Response text:', text);
      return NextResponse.json(
        { message: 'Invalid response from server' },
        { status: response.status || 500 }
      );
    }

    console.log('[API Route] Backend response status:', response.status);
    console.log('[API Route] Backend response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[API Route] Backend error:', data);
      return NextResponse.json(
        data,
        { status: response.status }
      );
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



