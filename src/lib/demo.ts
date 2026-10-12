import { describe } from "./conditions";
import { distanceM } from "./places";
import type { DayPoint, Forecast, HourPoint, Place } from "./types";

/**
 * Sample data for demo mode (DEMO_MODE=1 or ?demo=… in the URL).
 * Used for screenshots and offline development. The places below are made up
 * and the interface labels everything as demo data.
 */

export const DEMO_SCENARIOS = ["rain", "snow", "sunny", "night"] as const;
export type DemoScenario = (typeof DEMO_SCENARIOS)[number];

interface Scenario {
  date: string;
  hour: number;
  minute: number;
  tempC: number;
  feelsC: number;
  code: number;
  humidity: number;
  windKph: number;
  sunriseHour: number;
  sunsetHour: number;
  dailyCodes: number[];
  dailyHigh: number[];
  dailyLow: number[];
  hourlyCodes: [number, number][]; // [hours from now, code] change points
  rainChance: number;
}

const SCENARIOS: Record<DemoScenario, Scenario> = {
  rain: {
    date: "2026-10-14", hour: 18, minute: 40, tempC: 8, feelsC: 5, code: 63, humidity: 91, windKph: 22,
    sunriseHour: 7, sunsetHour: 18, rainChance: 85,
    hourlyCodes: [[0, 63], [3, 61], [6, 3], [11, 2], [16, 1]],
    dailyCodes: [63, 3, 1, 0, 2, 61, 61, 3, 1, 0],
    dailyHigh: [11, 13, 15, 16, 14, 12, 10, 12, 14, 15],
    dailyLow: [6, 5, 7, 8, 9, 8, 6, 5, 6, 7],
  },
  snow: {
    date: "2027-01-19", hour: 8, minute: 15, tempC: -4, feelsC: -10, code: 73, humidity: 86, windKph: 26,
    sunriseHour: 7, sunsetHour: 16, rainChance: 90,
    hourlyCodes: [[0, 73], [5, 71], [9, 3], [14, 3], [20, 2]],
    dailyCodes: [73, 71, 3, 0, 1, 3, 73, 3, 0, 1],
    dailyHigh: [-1, 0, -3, -5, -2, 1, 0, -2, -4, -1],
    dailyLow: [-8, -9, -12, -14, -10, -6, -7, -11, -13, -9],
  },
  sunny: {
    date: "2027-07-08", hour: 14, minute: 5, tempC: 29, feelsC: 31, code: 0, humidity: 48, windKph: 9,
    sunriseHour: 5, sunsetHour: 20, rainChance: 5,
    hourlyCodes: [[0, 0], [5, 1], [9, 0], [16, 1]],
    dailyCodes: [0, 1, 2, 95, 3, 1, 0, 0, 1, 2],
    dailyHigh: [30, 31, 28, 26, 24, 27, 29, 31, 30, 28],
    dailyLow: [19, 20, 19, 18, 17, 17, 18, 20, 21, 19],
  },
  night: {
    date: "2027-06-02", hour: 22, minute: 20, tempC: 17, feelsC: 17, code: 0, humidity: 64, windKph: 6,
    sunriseHour: 5, sunsetHour: 20, rainChance: 0,
    hourlyCodes: [[0, 0], [8, 1], [12, 2], [18, 0]],
    dailyCodes: [0, 2, 3, 61, 1, 0, 0, 2, 3, 1],
    dailyHigh: [23, 24, 21, 19, 22, 25, 26, 24, 22, 23],
    dailyLow: [13, 14, 14, 12, 11, 13, 15, 15, 14, 13],
  },
};

const pad = (n: number) => String(n).padStart(2, "0");

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function demoForecast(name: DemoScenario = "rain"): Forecast {
  const s = SCENARIOS[name];
  const lat = 43.6591;
  const lon = -70.2568;

  const hourly: HourPoint[] = [];
  for (let i = 0; i <= 24; i++) {
    const total = s.hour + i;
    const day = Math.floor(total / 24);
    const h = total % 24;
    const code = [...s.hourlyCodes].reverse().find(([at]) => i >= at)![1];
    // A gentle daily curve: warmest mid-afternoon, coolest before dawn.
    const curve = Math.cos(((h - 15) / 24) * 2 * Math.PI);
    const mid = (s.dailyHigh[day] + s.dailyLow[day]) / 2;
    const amp = (s.dailyHigh[day] - s.dailyLow[day]) / 2;
    const modelled = mid + amp * curve;
    // Ease from the current reading into the daily curve so the strip starts smoothly.
    const curve0 = (s.dailyHigh[0] + s.dailyLow[0]) / 2 +
      ((s.dailyHigh[0] - s.dailyLow[0]) / 2) * Math.cos(((s.hour - 15) / 24) * 2 * Math.PI);
    const offset = (s.tempC - curve0) * Math.max(0, 1 - i / 12);
    const tempC = Math.round((modelled + offset) * 10) / 10;
    hourly.push({
      time: `${addDays(s.date, day)}T${pad(h)}:00`,
      tempC,
      code,
      condition: describe(code).condition,
      isDay: h >= s.sunriseHour && h < s.sunsetHour,
      precipChance: Math.max(0, Math.round(s.rainChance - i * 6)),
    });
  }

  const daily: DayPoint[] = s.dailyCodes.map((code, i) => ({
    date: addDays(s.date, i),
    minC: s.dailyLow[i],
    maxC: s.dailyHigh[i],
    code,
    condition: describe(code).condition,
    precipChance: [61, 63, 71, 73, 95].includes(code) ? 70 : code === 3 ? 20 : 5,
  }));

  const { condition, label } = describe(s.code);
  return {
    place: "Portland",
    countryCode: "US",
    lat,
    lon,
    timezone: "America/New_York",
    localTime: `${s.date}T${pad(s.hour)}:${pad(s.minute)}`,
    current: {
      tempC: s.tempC,
      feelsLikeC: s.feelsC,
      code: s.code,
      condition,
      label,
      isDay: s.hour >= s.sunriseHour && s.hour < s.sunsetHour,
      humidity: s.humidity,
      windKph: s.windKph,
      precipChance: s.rainChance,
    },
    hourly,
    daily,
    sunrise: `${s.date}T${pad(s.sunriseHour)}:02`,
    sunset: `${s.date}T${pad(s.sunsetHour)}:11`,
    demo: true,
  };
}

// Made-up places, spread around the demo location.
const RAW_PLACES: [string, string, string, number, number, string | null][] = [
  ["Harbor Noodle Bar", "restaurant", "ramen;japanese", 0.0042, -0.0031, "Mo-Su 11:30-22:00"],
  ["Little Saigon Pho", "restaurant", "vietnamese", -0.0061, 0.0048, "Mo-Su 10:00-21:00"],
  ["Wharf Street Chowder Co.", "restaurant", "seafood", 0.0018, 0.0062, "Mo-Su 11:00-21:00"],
  ["Copper Kettle Café", "cafe", "coffee_shop", 0.0011, -0.0014, "Mo-Su 07:00-18:00"],
  ["Back Cove Coffee", "cafe", "coffee_shop", -0.0093, -0.0072, "Mo-Fr 06:30-16:00"],
  ["Slice of Munjoy", "restaurant", "pizza", 0.0081, 0.0105, "Mo-Su 11:00-23:00"],
  ["Monument Square Pizza", "fast_food", "pizza", -0.0012, 0.0021, "Mo-Su 11:00-01:00"],
  ["Spice Route Kitchen", "restaurant", "indian", -0.0108, 0.0034, "Tu-Su 16:00-22:00"],
  ["Bangkok Garden", "restaurant", "thai", 0.0066, -0.0089, "Mo-Su 11:30-21:30"],
  ["Golden Dumpling House", "restaurant", "chinese;dumpling", 0.0029, -0.0067, "Mo-Su 11:00-22:00"],
  ["Casco Bay Burgers", "fast_food", "burger", -0.0035, -0.0019, "Mo-Su 11:00-23:00"],
  ["Taqueria del Puerto", "restaurant", "mexican", 0.0053, 0.0016, "Mo-Su 11:00-22:00"],
  ["Fore River Sushi", "restaurant", "sushi;japanese", -0.0072, 0.0091, "Mo-Sa 12:00-21:30"],
  ["Island Poke", "fast_food", "poke;hawaiian", 0.0097, -0.0024, "Mo-Su 11:00-20:00"],
  ["Sweet Wave Creamery", "ice_cream", "ice_cream", 0.0024, 0.0039, "Mo-Su 12:00-22:00"],
  ["Pearl Tea Bar", "cafe", "bubble_tea", -0.0047, 0.0058, "Mo-Su 12:00-21:00"],
  ["Morning Rise Bakery", "bakery", "", 0.0058, -0.0047, "Tu-Su 06:30-14:00"],
  ["Eastern Prom Diner", "restaurant", "diner;breakfast", -0.0024, -0.0091, "Mo-Su 06:00-14:00"],
  ["Old Port Lobster Shack", "restaurant", "seafood;lobster", 0.0009, 0.0083, "Mo-Su 11:00-20:00"],
  ["Greenleaf Salads", "fast_food", "salad;healthy", -0.0056, -0.0038, "Mo-Fr 10:30-19:00"],
  ["Smokestack BBQ", "restaurant", "barbecue", 0.0112, 0.0044, "We-Su 11:30-21:00"],
  ["Trattoria Sole", "restaurant", "italian", -0.0019, 0.0103, "Tu-Su 17:00-22:00"],
  ["Commercial St. Deli", "fast_food", "sandwich;deli", 0.0037, -0.0012, "Mo-Sa 08:00-16:00"],
];

export function demoPlaces(lat = 43.6591, lon = -70.2568): Place[] {
  return RAW_PLACES.map(([name, kind, cuisine, dLat, dLon, hours], i) => {
    const pLat = lat + dLat;
    const pLon = lon + dLon;
    return {
      id: `demo/${i}`,
      name,
      kind,
      cuisines: cuisine ? cuisine.split(";") : [],
      lat: pLat,
      lon: pLon,
      distanceM: distanceM(lat, lon, pLat, pLon),
      openingHours: hours,
      website: null,
      address: null,
    };
  }).sort((a, b) => a.distanceM - b.distanceM);
}

export function isDemoScenario(v: string | null): v is DemoScenario {
  return !!v && (DEMO_SCENARIOS as readonly string[]).includes(v);
}
