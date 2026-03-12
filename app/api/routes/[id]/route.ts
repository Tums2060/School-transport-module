import { NextRequest, NextResponse } from 'next/server';
import { getRouteById } from '@/lib/dataUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const route = await getRouteById(params.id);

    if (!route) {
      return NextResponse.json(
        { success: false, message: 'Route not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: route });
  } catch (error) {
    console.error('Error fetching route:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch route' },
      { status: 500 }
    );
  }
}
