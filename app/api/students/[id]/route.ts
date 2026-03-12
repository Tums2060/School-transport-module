import { NextRequest, NextResponse } from 'next/server';
import { getStudentById } from '@/lib/dataUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await getStudentById(id);

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: student });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}
