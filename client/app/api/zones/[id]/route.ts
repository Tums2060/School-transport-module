import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value || '';
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/zones/${id}`, {
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
    console.error('Error updating zone:', error);
    return NextResponse.json({ success: false, message: 'Failed to update zone' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value || '';
    const res = await fetch(`${BACKEND_URL}/api/zones/${id}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `token=${token}`
      }
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    console.error('Error deleting zone:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete zone' }, { status: 500 });
  }
}
