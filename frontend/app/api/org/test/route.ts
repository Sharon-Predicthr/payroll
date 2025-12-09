import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[API Route] GET /api/org/test called');
  return NextResponse.json({ success: true, message: 'API route is working' });
}

