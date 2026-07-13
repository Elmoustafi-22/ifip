import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Read Vercel IP Geolocation headers
  // For local development, Vercel headers won't be present, so we default to 'NG' (Nigeria)
  const countryCode = request.headers.get('x-vercel-ip-country') || 'NG';
  const region = request.headers.get('x-vercel-ip-country-region') || '';
  const city = request.headers.get('x-vercel-ip-city') || '';
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';

  return NextResponse.json({
    countryCode: countryCode.toUpperCase(),
    region,
    city,
    ip
  });
}
