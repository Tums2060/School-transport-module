import { NextRequest, NextResponse } from 'next/server';
import { getActiveStudentsCount } from '@/lib/dataUtils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('count') === 'true';

    if (countOnly) {
      const count = await getActiveStudentsCount();
      return NextResponse.json({ success: true, count });
    }

    const res = await fetch(`${BACKEND_URL}/api/students?${searchParams.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
