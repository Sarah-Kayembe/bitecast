import { describe } from "./conditions";
import type { DayPoint, Forecast, HourPoint } from "./types";

const UA = "BiteCast/1.0 (https://github.com/Sarah-Kayembe/bitecast)";

interface OpenMeteoResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    is_day: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    is_day: number[];
    precipitation_probability: (number | null)[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    sunrise: string[];
    sunset: string[];
  };
}

export async function fetchForecast(
  lat: number,
  lon: number,
  placeName?: string
): Promise<Forecast> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: "auto",
    forecast_days: "10",
    current:
      "temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m",
    hourly: "temperature_2m,weather_code,is_day,precipitation_probability",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
  }).toString();

  const [res, where] = await Promise.all([
    fetch(url, { next: { revalidate: 600 } }),
    placeName ? Promise.resolve({ name: placeName, countryCode: null }) : reverseGeocode(lat, lon),
  ]);
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
  const data = (await res.json()) as OpenMeteoResponse;
  return normalize(data, lat, lon, where.name, where.countryCode);
}

export function normalize(
  data: OpenMeteoResponse,
  lat: number,
  lon: number,
  place: string,
  countryCode: string | null
): Forecast {
  const now = data.current.time; // local time, e.g. 2026-10-11T19:45
  const nowHour = now.slice(0, 13);

  // Start the hourly strip at the current hour and keep the next 24.
  const start = Math.max(0, data.hourly.time.findIndex((t) => t.slice(0, 13) === nowHour));
  const hourly: HourPoint[] = data.hourly.time.slice(start, start + 25).map((time, i) => {
    const j = start + i;
    const code = data.hourly.weather_code[j];
    return {
      time,
      tempC: data.hourly.temperature_2m[j],
      code,
      condition: describe(code).condition,
      isDay: data.hourly.is_day[j] === 1,
      precipChance: data.hourly.precipitation_probability[j] ?? 0,
    };
  });

  const daily: DayPoint[] = data.daily.time.map((date, i) => {
    const code = data.daily.weather_code[i];
    return {
      date,
      minC: data.daily.temperature_2m_min[i],
      maxC: data.daily.temperature_2m_max[i],
      code,
      condition: describe(code).condition,
      precipChance: data.daily.precipitation_probability_max[i] ?? 0,
    };
  });

  const code = data.current.weather_code;
  const { condition, label } = describe(code);

  return {
    place,
    countryCode,
    lat,
    lon,
    timezone: data.timezone,
    localTime: now,
    current: {
      tempC: data.current.temperature_2m,
      feelsLikeC: data.current.apparent_temperature,
      code,
      condition,
      label,
      isDay: data.current.is_day === 1,
      humidity: data.current.relative_humidity_2m,
      windKph: data.current.wind_speed_10m,
      precipChance: hourly[0]?.precipChance ?? 0,
    },
    hourly,
    daily,
    sunrise: data.daily.sunrise[0] ?? null,
    sunset: data.daily.sunset[0] ?? null,
    demo: false,
  };
}

/** City name for a coordinate, from OpenStreetMap's Nominatim service. */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ name: string; countryCode: string | null }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 86400 } });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const a = data.address ?? {};
    const name = a.city || a.town || a.village || a.municipality || a.county || "My Location";
    return { name, countryCode: a.country_code ? String(a.country_code).toUpperCase() : null };
  } catch {
    return { name: "My Location", countryCode: null };
  }
}

export interface CityResult {
  name: string;
  region: string;
  countryCode: string;
  lat: number;
  lon: number;
}

/** City search, from Open-Meteo's geocoding API. */
export async function searchCities(query: string): Promise<CityResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: "6", language: "en" }).toString();
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`City search returned ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map(
    (r: { name: string; admin1?: string; country?: string; country_code: string; latitude: number; longitude: number }) => ({
      name: r.name,
      region: [r.admin1, r.country].filter(Boolean).join(", "),
      countryCode: r.country_code,
      lat: r.latitude,
      lon: r.longitude,
    })
  );
}
