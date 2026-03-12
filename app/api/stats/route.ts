import { NextResponse } from 'next/server';
import { getActiveStudentsCount, getActiveBusesCount, getActiveRoutesCount } from '@/lib/dataUtils';

export async function GET() {
  try {
    const [studentsCount, busesCount, routesCount] = await Promise.all([
      getActiveStudentsCount(),
      getActiveBusesCount(),
      getActiveRoutesCount(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        students: studentsCount,
        buses: busesCount,
        routes: routesCount,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
