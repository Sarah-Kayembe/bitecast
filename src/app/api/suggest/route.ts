import { NextResponse, type NextRequest } from "next/server";
import { geminiSuggestions } from "@/lib/agent";
import { demoForecast, demoPlaces } from "@/lib/demo";
import { mealFor, ruleSuggestions, weatherPhrase } from "@/lib/foods";
import { fetchNearbyFoodPlaces } from "@/lib/places";
import { coords, demoFrom } from "@/lib/request";
import type { Forecast, Place, Suggestions } from "@/lib/types";
import { fetchForecast } from "@/lib/weather";

const MEAL_WORDS = {
  breakfast: "breakfast",
  lunch: "lunch",
  snack: "an afternoon snack",
  dinner: "dinner",
  late: "a late-night bite",
} as const;

function ruleHeadline(f: Forecast): string {
  const meal = mealFor(Number(f.localTime.slice(11, 13)));
  return `${weatherPhrase(f)}. Here's what sounds good for ${MEAL_WORDS[meal]}.`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const unit: "F" | "C" = body.unit === "C" ? "C" : "F";
  const demo = demoFrom(typeof body.demo === "string" ? body.demo : null);

  let forecast: Forecast;
  let places: Place[];
  try {
    if (demo) {
      forecast = demoForecast(demo);
      places = demoPlaces();
    } else {
      const at = coords(body.lat, body.lon);
      if (!at) return NextResponse.json({ error: "Send a valid lat and lon." }, { status: 400 });
      [forecast, places] = await Promise.all([
        fetchForecast(at.lat, at.lon, "here"),
        fetchNearbyFoodPlaces(at.lat, at.lon).catch(() => [] as Place[]),
      ]);
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      const ai = await geminiSuggestions(forecast, places, unit, key);
      const out: Suggestions = {
        source: "gemini",
        headline: ai.headline || ruleHeadline(forecast),
        picks: ai.picks,
        demo: !!demo,
      };
      return NextResponse.json(out);
    } catch (e) {
      console.error("Gemini failed, using rule-based picks:", (e as Error).message);
    }
  }

  const out: Suggestions = {
    source: "rules",
    headline: ruleHeadline(forecast),
    picks: ruleSuggestions(forecast, places),
    demo: !!demo,
  };
  return NextResponse.json(out);
}
