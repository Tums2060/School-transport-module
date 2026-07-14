import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

type Params = {
  params: Promise<{ busNumber: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { busNumber } = await params;
    const token = request.cookies.get('token')?.value || '';
    const res = await fetch(`${BACKEND_URL}/api/driver/telemetry/${busNumber}`, {
      headers: { 'Cookie': `token=${token}` }
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
