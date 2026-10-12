import type { Condition } from "./types";

// WMO weather codes, as returned by Open-Meteo.
// https://open-meteo.com/en/docs#weathervariables
const CODES: Record<number, [Condition, string]> = {
  0: ["clear", "Clear"],
  1: ["clear", "Mostly Clear"],
  2: ["partly-cloudy", "Partly Cloudy"],
  3: ["cloudy", "Cloudy"],
  45: ["fog", "Foggy"],
  48: ["fog", "Freezing Fog"],
  51: ["drizzle", "Light Drizzle"],
  53: ["drizzle", "Drizzle"],
  55: ["drizzle", "Heavy Drizzle"],
  56: ["drizzle", "Freezing Drizzle"],
  57: ["drizzle", "Freezing Drizzle"],
  61: ["rain", "Light Rain"],
  63: ["rain", "Rain"],
  65: ["rain", "Heavy Rain"],
  66: ["rain", "Freezing Rain"],
  67: ["rain", "Freezing Rain"],
  71: ["snow", "Light Snow"],
  73: ["snow", "Snow"],
  75: ["snow", "Heavy Snow"],
  77: ["snow", "Snow Grains"],
  80: ["rain", "Showers"],
  81: ["rain", "Showers"],
  82: ["rain", "Heavy Showers"],
  85: ["snow", "Snow Showers"],
  86: ["snow", "Heavy Snow Showers"],
  95: ["storm", "Thunderstorms"],
  96: ["storm", "Thunderstorms"],
  99: ["storm", "Severe Thunderstorms"],
};

export function describe(code: number): { condition: Condition; label: string } {
  const hit = CODES[code];
  if (!hit) return { condition: "cloudy", label: "Cloudy" };
  return { condition: hit[0], label: hit[1] };
}

export function isWet(c: Condition): boolean {
  return c === "drizzle" || c === "rain" || c === "storm";
}

export function iconFor(c: Condition, isDay: boolean): string {
  switch (c) {
    case "clear":
      return isDay ? "☀️" : "🌙";
    case "partly-cloudy":
      return isDay ? "⛅" : "☁️";
    case "cloudy":
      return "☁️";
    case "fog":
      return "🌫️";
    case "drizzle":
      return "🌦️";
    case "rain":
      return "🌧️";
    case "snow":
      return "🌨️";
    case "storm":
      return "⛈️";
  }
}
