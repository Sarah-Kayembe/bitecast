import { NextResponse, type NextRequest } from "next/server";
import { searchCities } from "@/lib/weather";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json([]);
  if (process.env.DEMO_MODE === "1") {
    return NextResponse.json([{ name: "Portland", region: "Maine, United States", countryCode: "US", lat: 43.6591, lon: -70.2568 }]);
  }
  try {
    return NextResponse.json(await searchCities(q));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
