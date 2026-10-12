// Shared shapes passed between the API routes and the interface.
// Temperatures are always stored in Celsius and converted for display.

export type Condition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

export interface CurrentWeather {
  tempC: number;
  feelsLikeC: number;
  code: number;
  condition: Condition;
  label: string;
  isDay: boolean;
  humidity: number;
  windKph: number;
  precipChance: number;
}

export interface HourPoint {
  time: string; // local ISO time, no offset
  tempC: number;
  code: number;
  condition: Condition;
  isDay: boolean;
  precipChance: number;
}

export interface DayPoint {
  date: string; // YYYY-MM-DD
  minC: number;
  maxC: number;
  code: number;
  condition: Condition;
  precipChance: number;
}

export interface Forecast {
  place: string;
  countryCode: string | null;
  lat: number;
  lon: number;
  timezone: string;
  localTime: string; // local ISO time at the moment of the request
  current: CurrentWeather;
  hourly: HourPoint[];
  daily: DayPoint[];
  sunrise: string | null;
  sunset: string | null;
  demo: boolean;
}

export interface Place {
  id: string;
  name: string;
  kind: string; // restaurant, fast_food, cafe, ice_cream, bakery…
  cuisines: string[];
  lat: number;
  lon: number;
  distanceM: number;
  openingHours: string | null;
  website: string | null;
  address: string | null;
}

export interface FoodPick {
  id: string;
  name: string;
  emoji: string;
  why: string;
  places: Place[];
}

export interface Suggestions {
  source: "gemini" | "rules";
  headline: string;
  picks: FoodPick[];
  demo: boolean;
}
