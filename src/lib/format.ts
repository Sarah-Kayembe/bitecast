export type Unit = "F" | "C";

export function temp(c: number, unit: Unit): number {
  return Math.round(unit === "F" ? (c * 9) / 5 + 32 : c);
}

export function deg(c: number, unit: Unit): string {
  return `${temp(c, unit)}°`;
}

export function distance(m: number, unit: Unit): string {
  if (unit === "F") {
    const mi = m / 1609.34;
    return mi < 0.1 ? `${Math.round(m * 3.281)} ft` : `${mi.toFixed(1)} mi`;
  }
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function wind(kph: number, unit: Unit): string {
  return unit === "F" ? `${Math.round(kph / 1.609)} mph` : `${Math.round(kph)} km/h`;
}

/** "7PM" from a local ISO time like 2026-10-14T19:00. */
export function hourLabel(iso: string): string {
  const h = Number(iso.slice(11, 13));
  const suffix = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${suffix}`;
}

export function clockLabel(iso: string | null): string {
  if (!iso) return "–";
  const h = Number(iso.slice(11, 13));
  const m = iso.slice(14, 16);
  const suffix = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:${m} ${suffix}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayLabel(date: string, index: number): string {
  if (index === 0) return "Today";
  return DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

export function cuisineLabel(cuisines: string[], kind: string): string {
  const raw = cuisines[0] ?? kind;
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function defaultUnit(): Unit {
  if (typeof navigator === "undefined") return "F";
  const region = navigator.language.split("-")[1]?.toUpperCase();
  return !region || ["US", "LR", "MM", "BS", "BZ", "KY", "PW"].includes(region) ? "F" : "C";
}

export function isApple(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|Macintosh/.test(navigator.userAgent);
}

export function mapsLink(name: string, lat: number, lon: number): string {
  if (isApple()) {
    return `https://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${lat},${lon}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${lat},${lon}`)}`;
}

export function deliveryLink(name: string, city: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} ${city} order online`)}`;
}
