import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveCuaca } from '@/lib/weather-bmkg';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const isGpsParam = searchParams.get('isGps') === 'true';

    const lat = latParam ? parseFloat(latParam) : -7.737;
    const lon = lonParam ? parseFloat(lonParam) : 111.416;

    const data = await fetchLiveCuaca(
      isNaN(lat) ? -7.737 : lat,
      isNaN(lon) ? 111.416 : lon,
      isGpsParam
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
