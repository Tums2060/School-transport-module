import { NextRequest, NextResponse } from 'next/server';
import { getBusById } from '@/lib/dataUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bus = await getBusById(params.id);

    if (!bus) {
      return NextResponse.json(
        { success: false, message: 'Bus not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: bus });
  } catch (error) {
    console.error('Error fetching bus:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch bus' },
      { status: 500 }
    );
  }
}
