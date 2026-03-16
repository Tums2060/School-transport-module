import { NextRequest, NextResponse } from 'next/server';
import { getStudents, getActiveStudentsCount } from '@/lib/dataUtils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('count') === 'true';

    if (countOnly) {
      const count = await getActiveStudentsCount();
      return NextResponse.json({ success: true, count });
    }

    const students = await getStudents();
    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
