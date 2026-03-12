import { NextRequest, NextResponse } from 'next/server';
import { getBuses, getActiveBusesCount } from '@/lib/dataUtils';

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
