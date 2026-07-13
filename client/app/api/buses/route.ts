import { NextRequest, NextResponse } from 'next/server';
import { getBuses, getActiveBusesCount } from '@/lib/dataUtils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('count') === 'true';

    if (countOnly) {
      const count = await getActiveBusesCount();
      return NextResponse.json({ success: true, count });
    }

    const buses = await getBuses();
    return NextResponse.json({ success: true, data: buses });
  } catch (error) {
    console.error('Error fetching buses:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch buses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || '';
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/buses`, {
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
    console.error('Error creating bus:', error);
    return NextResponse.json({ success: false, message: 'Failed to create bus' }, { status: 500 });
  }
}
