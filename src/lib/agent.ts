import { feelFor, matchPlaces, mealFor } from "./foods";
import type { FoodPick, Forecast, Place } from "./types";

/**
 * Gemini agent with function calling.
 *
 * The model gets three tools: the live weather, a summary of the kinds of food
 * places that actually exist nearby, and a search for places serving a dish.
 * It is asked to check availability before recommending anything, then answer
 * with three picks as JSON. Any failure falls back to the rule-based picks.
 */

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_TURNS = 6;

const SYSTEM = `You are BiteCast, a friendly food guide that suggests what to eat based on the weather.
Always call get_weather and nearby_cuisines first. Then use find_places to confirm that each dish you
are considering is actually available nearby. Prefer dishes with nearby places. Match the time of day
(breakfast, lunch, afternoon snack, dinner or late night) and how the weather feels.

When you are done, reply with ONLY a JSON object, no markdown, in this exact shape:
{"headline": "one short friendly sentence about eating in this weather",
 "picks": [{"name": "dish name", "emoji": "one food emoji", "why": "one sentence tying the dish to the weather",
            "cuisines": ["OpenStreetMap cuisine values that serve it"], "keywords": ["words likely in a place name"]}]}
Give exactly 3 picks, each different in style. Keep every sentence under 20 words. Use the temperature unit given.`;

interface Part {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}
interface Content {
  role: "user" | "model";
  parts: Part[];
}

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_weather",
        description: "Current weather, today's high and low, and the local time and meal for the user's location.",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "nearby_cuisines",
        description: "Counts of the cuisines and kinds of food places within walking or short driving distance.",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "find_places",
        description: "Find nearby places that likely serve a dish. Returns the closest matches with distances.",
        parameters: {
          type: "object",
          properties: {
            dish: { type: "string", description: "The dish, e.g. ramen" },
            cuisines: {
              type: "array",
              items: { type: "string" },
              description: "OpenStreetMap cuisine values, e.g. ramen, japanese, noodle",
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Words likely to appear in a place name, e.g. ramen",
            },
          },
          required: ["dish", "cuisines"],
        },
      },
    ],
  },
];

function toUnit(c: number, unit: "F" | "C"): string {
  return unit === "F" ? `${Math.round((c * 9) / 5 + 32)}°F` : `${Math.round(c)}°C`;
}

function weatherSummary(f: Forecast, unit: "F" | "C") {
  const today = f.daily[0];
  const nextHours = f.hourly.slice(0, 6);
  return {
    place: f.place,
    localTime: f.localTime.replace("T", " "),
    meal: mealFor(Number(f.localTime.slice(11, 13))),
    condition: f.current.label,
    isDaytime: f.current.isDay,
    temperature: toUnit(f.current.tempC, unit),
    feelsLike: toUnit(f.current.feelsLikeC, unit),
    feels: feelFor(f.current.feelsLikeC),
    high: today ? toUnit(today.maxC, unit) : null,
    low: today ? toUnit(today.minC, unit) : null,
    chanceOfRainNext6Hours: Math.max(0, ...nextHours.map((h) => h.precipChance)) + "%",
  };
}

function cuisineSummary(places: Place[]) {
  const counts: Record<string, number> = {};
  for (const p of places) {
    const keys = p.cuisines.length ? p.cuisines : [p.kind];
    for (const k of keys) counts[k] = (counts[k] ?? 0) + 1;
  }
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
  return { totalPlaces: places.length, byCuisine: Object.fromEntries(top) };
}

function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).toLowerCase().trim()).filter(Boolean) : [];
}

function runTool(
  call: { name: string; args?: Record<string, unknown> },
  f: Forecast,
  places: Place[],
  unit: "F" | "C"
): Record<string, unknown> {
  switch (call.name) {
    case "get_weather":
      return weatherSummary(f, unit);
    case "nearby_cuisines":
      return cuisineSummary(places);
    case "find_places": {
      const hits = matchPlaces(
        { cuisines: asStrings(call.args?.cuisines), nameWords: asStrings(call.args?.keywords) },
        places,
        3
      );
      return {
        dish: call.args?.dish,
        found: hits.length,
        closest: hits.map((p) => ({ name: p.name, distanceMeters: p.distanceM, cuisines: p.cuisines })),
      };
    }
    default:
      return { error: `Unknown tool ${call.name}` };
  }
}

interface AgentPick {
  name: string;
  emoji: string;
  why: string;
  cuisines: string[];
  keywords: string[];
}

export function parseAgentAnswer(text: string): { headline: string; picks: AgentPick[] } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(text.slice(start, end + 1));
    const picks: AgentPick[] = (Array.isArray(data.picks) ? data.picks : [])
      .filter((p: Record<string, unknown>) => typeof p?.name === "string" && typeof p?.why === "string")
      .slice(0, 3)
      .map((p: Record<string, unknown>) => ({
        name: String(p.name).slice(0, 40),
        emoji: typeof p.emoji === "string" && p.emoji.length <= 8 ? p.emoji : "🍽️",
        why: String(p.why).slice(0, 200),
        cuisines: asStrings(p.cuisines),
        keywords: asStrings(p.keywords),
      }));
    if (picks.length === 0) return null;
    const headline = typeof data.headline === "string" ? data.headline.slice(0, 160) : "";
    return { headline, picks };
  } catch {
    return null;
  }
}

export async function geminiSuggestions(
  f: Forecast,
  places: Place[],
  unit: "F" | "C",
  apiKey: string,
  model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
): Promise<{ headline: string; picks: FoodPick[] }> {
  const contents: Content[] = [
    {
      role: "user",
      parts: [{ text: `What should I eat right now? Use ${unit === "F" ? "Fahrenheit" : "Celsius"}.` }],
    },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await fetch(`${API}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        tools: TOOLS,
        generationConfig: { temperature: 0.8 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini returned ${res.status}`);
    const data = await res.json();
    const parts: Part[] = data.candidates?.[0]?.content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall!);

    if (calls.length === 0) {
      const text = parts.map((p) => p.text ?? "").join("");
      const answer = parseAgentAnswer(text);
      if (!answer) throw new Error("Gemini answer was not valid JSON");
      return {
        headline: answer.headline,
        picks: answer.picks.map((p, i) => ({
          id: `ai-${i}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name: p.name,
          emoji: p.emoji,
          why: p.why,
          places: matchPlaces({ cuisines: p.cuisines, nameWords: p.keywords }, places),
        })),
      };
    }

    contents.push({ role: "model", parts });
    contents.push({
      role: "user",
      parts: calls.map((call) => ({
        functionResponse: { name: call.name, response: runTool(call, f, places, unit) },
      })),
    });
  }
  throw new Error("Gemini did not finish within the turn limit");
}
