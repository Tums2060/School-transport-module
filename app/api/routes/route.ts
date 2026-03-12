import { NextRequest, NextResponse } from 'next/server';
import { getRoutes, getActiveRoutesCount } from '@/lib/dataUtils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('count') === 'true';

    if (countOnly) {
      const count = await getActiveRoutesCount();
      return NextResponse.json({ success: true, count });
    }

    const routes = await getRoutes();
    return NextResponse.json({ success: true, data: routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}
