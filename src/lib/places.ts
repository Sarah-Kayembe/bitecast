import type { Place } from "./types";

const UA = "BiteCast/1.0 (https://github.com/Sarah-Kayembe/bitecast)";
const OVERPASS = "https://overpass-api.de/api/interpreter";
export const SEARCH_RADIUS_M = 2500;

/** Overpass query for named food places around a point. */
export function buildOverpassQuery(lat: number, lon: number, radius = SEARCH_RADIUS_M): string {
  const around = `around:${radius},${lat.toFixed(5)},${lon.toFixed(5)}`;
  return `[out:json][timeout:20];
(
  nwr(${around})["amenity"~"^(restaurant|fast_food|cafe|ice_cream|food_court|pub)$"]["name"];
  nwr(${around})["shop"~"^(bakery|pastry|deli)$"]["name"];
);
out center tags 400;`;
}

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function distanceM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function parseElements(elements: OsmElement[], lat: number, lon: number): Place[] {
  const out: Place[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const pLat = el.lat ?? el.center?.lat;
    const pLon = el.lon ?? el.center?.lon;
    if (!tags.name || pLat == null || pLon == null) continue;
    const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
    out.push({
      id: `${el.type}/${el.id}`,
      name: tags.name,
      kind: tags.amenity ?? tags.shop ?? "restaurant",
      cuisines: (tags.cuisine ?? "")
        .split(";")
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
      lat: pLat,
      lon: pLon,
      distanceM: distanceM(lat, lon, pLat, pLon),
      openingHours: tags.opening_hours ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      address: street || null,
    });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

// Overpass is a shared community service, so results are cached per area.
const cache = new Map<string, { at: number; places: Place[] }>();
const TTL_MS = 15 * 60 * 1000;

export async function fetchNearbyFoodPlaces(lat: number, lon: number): Promise<Place[]> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    // Distances are recomputed from the exact point, the cached list covers the area.
    return hit.places
      .map((p) => ({ ...p, distanceM: distanceM(lat, lon, p.lat, p.lon) }))
      .sort((a, b) => a.distanceM - b.distanceM);
  }
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: "data=" + encodeURIComponent(buildOverpassQuery(lat, lon)),
  });
  if (!res.ok) throw new Error(`Places service returned ${res.status}`);
  const data = await res.json();
  const places = parseElements(data.elements ?? [], lat, lon);
  cache.set(key, { at: Date.now(), places });
  return places;
}
