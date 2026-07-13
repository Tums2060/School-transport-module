import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const result = await res.json();
    if (!result.success) {
      return NextResponse.json(result, { status: res.status });
    }

    const response = NextResponse.json(result);
    // Proxy cookies
    const setCookieHeader = res.headers.get('set-cookie');
    if (setCookieHeader) {
      response.headers.set('set-cookie', setCookieHeader);
    }
    return response;
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server login error' },
      { status: 500 }
    );
  }
}
