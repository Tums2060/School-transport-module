import { NextRequest, NextResponse } from 'next/server';
import { getRoutes, getActiveRoutesCount, writeData, Route } from '@/lib/dataUtils';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actorRole, route } = body as { actorRole?: string; route?: Partial<Route> };

    if (actorRole !== 'superior_Admin') {
      return NextResponse.json(
        { success: false, message: 'Only superior_Admin can create routes' },
        { status: 403 }
      );
    }

    if (!route?.routeName || !route?.routeCode) {
      return NextResponse.json(
        { success: false, message: 'routeName and routeCode are required' },
        { status: 400 }
      );
    }

    const routes = await getRoutes();

    const newRoute: Route = {
      id: `route_${Date.now()}`,
      routeName: route.routeName,
      routeCode: route.routeCode,
      busAssigned: route.busAssigned || null,
      driverAssigned: route.driverAssigned || null,
      driverName: route.driverName || null,
      status: route.status === 'Inactive' ? 'Inactive' : 'Active',
      pickupTime: route.pickupTime || '06:30 AM',
      dropoffTime: route.dropoffTime || '03:30 PM',
      distance: route.distance || '0 km',
      estimatedDuration: route.estimatedDuration || '0 minutes',
      studentsAssigned: route.studentsAssigned || 0,
      stops: route.stops || [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isActive: route.status === 'Inactive' ? false : true,
      notes: route.notes,
    };

    const updated = [newRoute, ...routes];
    await writeData('routes.json', updated);

    return NextResponse.json({ success: true, data: newRoute });
  } catch (error) {
    console.error('Error creating route:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create route' },
      { status: 500 }
    );
  }
}
