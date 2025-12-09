import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure this route is dynamic

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get backend URL - ensure it doesn't have /api prefix
    let backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    // Remove any trailing /api if present
    backendUrl = backendUrl.replace(/\/api$/, '');
    // Backend endpoint is /auth/login (not /api/auth/login)
    const loginUrl = `${backendUrl}/auth/login`;
    
    console.log('[API Route] Backend URL:', backendUrl);
    console.log('[API Route] Proxying login to:', loginUrl);
    console.log('[API Route] Request body:', { email: body.email, password: '***' });
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('[API Route] Backend response status:', response.status);

    if (!response.ok) {
      console.error('[API Route] Login failed:', data);
      return NextResponse.json(
        { message: data.message || 'Login failed' },
        { status: response.status }
      );
    }

    console.log('[API Route] Login successful');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

