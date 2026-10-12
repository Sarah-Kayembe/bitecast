import { NextResponse, type NextRequest } from "next/server";
import { demoForecast } from "@/lib/demo";
import { coords, demoFrom } from "@/lib/request";
import { fetchForecast } from "@/lib/weather";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const demo = demoFrom(q.get("demo"));
  if (demo) return NextResponse.json(demoForecast(demo));

  const at = coords(q.get("lat"), q.get("lon"));
  if (!at) return NextResponse.json({ error: "Send a valid lat and lon." }, { status: 400 });
  try {
    const name = q.get("name")?.slice(0, 80) || undefined;
    return NextResponse.json(await fetchForecast(at.lat, at.lon, name));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
