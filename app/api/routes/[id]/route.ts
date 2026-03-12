import { NextRequest, NextResponse } from 'next/server';
import { getRouteById, getRoutes, writeData, Route } from '@/lib/dataUtils';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { actorRole, route } = body as { actorRole?: string; route?: Partial<Route> };

    if (actorRole !== 'superior_Admin') {
      return NextResponse.json(
        { success: false, message: 'Only superior_Admin can edit routes' },
        { status: 403 }
      );
    }

    const routes = await getRoutes();
    const index = routes.findIndex((r) => r.id === params.id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, message: 'Route not found' },
        { status: 404 }
      );
    }

    const existing = routes[index];
    const nextStatus = route?.status || existing.status;

    const updatedRoute: Route = {
      ...existing,
      ...route,
      status: nextStatus === 'Inactive' ? 'Inactive' : 'Active',
      isActive: nextStatus === 'Inactive' ? false : true,
      lastUpdated: new Date().toISOString(),
    };

    routes[index] = updatedRoute;
    await writeData('routes.json', routes);

    return NextResponse.json({ success: true, data: updatedRoute });
  } catch (error) {
    console.error('Error updating route:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update route' },
      { status: 500 }
    );
  }
}
