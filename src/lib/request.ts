import { DEMO_SCENARIOS, isDemoScenario, type DemoScenario } from "./demo";

/** Demo scenario for this request, or null for live data. */
export function demoFrom(value: string | null): DemoScenario | null {
  if (isDemoScenario(value)) return value;
  if (process.env.DEMO_MODE === "1") return DEMO_SCENARIOS[0];
  return null;
}

export function coords(lat: unknown, lon: unknown): { lat: number; lon: number } | null {
  const a = Number(lat);
  const b = Number(lon);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: Math.round(a * 1e4) / 1e4, lon: Math.round(b * 1e4) / 1e4 };
}
