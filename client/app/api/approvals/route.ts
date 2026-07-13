import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || '';
    const res = await fetch(`${BACKEND_URL}/api/approvals`, {
      cache: 'no-store',
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch approvals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || '';
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    console.error('Error creating approval:', error);
    return NextResponse.json({ success: false, message: 'Failed to create approval' }, { status: 500 });
  }
}
