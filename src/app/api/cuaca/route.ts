import { NextResponse } from 'next/server';
import { getCuacaLembeyan } from '@/lib/weather-bmkg';

export async function GET() {
  try {
    const data = getCuacaLembeyan();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
