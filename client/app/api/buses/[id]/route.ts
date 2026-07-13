import { NextRequest, NextResponse } from 'next/server';
import { getBusById } from '@/lib/dataUtils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bus = await getBusById(id);

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value || '';
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/buses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    console.error('Error updating bus:', error);
    return NextResponse.json({ success: false, message: 'Failed to update bus' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value || '';
    const res = await fetch(`${BACKEND_URL}/api/buses/${id}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    console.error('Error deleting bus:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete bus' }, { status: 500 });
  }
}
