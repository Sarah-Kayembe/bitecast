import { describe, expect, it } from "vitest";
import { parseAgentAnswer } from "@/lib/agent";
import { describe as describeCode } from "@/lib/conditions";
import { buildOverpassQuery, distanceM, parseElements } from "@/lib/places";
import { normalize } from "@/lib/weather";

describe("weather codes", () => {
  it("maps WMO codes to conditions", () => {
    expect(describeCode(0).condition).toBe("clear");
    expect(describeCode(63)).toEqual({ condition: "rain", label: "Rain" });
    expect(describeCode(75).condition).toBe("snow");
    expect(describeCode(95).condition).toBe("storm");
    expect(describeCode(12345).condition).toBe("cloudy");
  });
});

describe("Open-Meteo response", () => {
  const hours = Array.from({ length: 48 }, (_, i) => `2026-10-14T${String(i % 24).padStart(2, "0")}:00`);
  const raw = {
    timezone: "America/New_York",
    current: { time: "2026-10-14T18:40", temperature_2m: 8, apparent_temperature: 5, weather_code: 63, is_day: 0, relative_humidity_2m: 90, wind_speed_10m: 20 },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, i) => i),
      weather_code: hours.map(() => 63),
      is_day: hours.map(() => 0),
      precipitation_probability: hours.map(() => 80),
    },
    daily: {
      time: ["2026-10-14"], weather_code: [63], temperature_2m_max: [11], temperature_2m_min: [6],
      precipitation_probability_max: [90], sunrise: ["2026-10-14T07:02"], sunset: ["2026-10-14T18:11"],
    },
  };
  it("starts the hourly strip at the current hour", () => {
    const f = normalize(raw, 43.6, -70.2, "Portland", "US");
    expect(f.hourly[0].time).toBe("2026-10-14T18:00");
    expect(f.hourly).toHaveLength(25);
    expect(f.current.condition).toBe("rain");
    expect(f.current.isDay).toBe(false);
    expect(f.current.precipChance).toBe(80);
  });
});

describe("OpenStreetMap places", () => {
  it("builds a query around the point", () => {
    const q = buildOverpassQuery(43.65912, -70.25681, 1000);
    expect(q).toContain("around:1000,43.65912,-70.25681");
    expect(q).toContain("restaurant|fast_food|cafe|ice_cream");
  });
  it("measures distance in meters", () => {
    expect(distanceM(43.6591, -70.2568, 43.6591, -70.2568)).toBe(0);
    const d = distanceM(43.6591, -70.2568, 43.6681, -70.2568); // about 0.009 degrees north
    expect(d).toBeGreaterThan(990);
    expect(d).toBeLessThan(1010);
  });
  it("parses nodes and ways, skipping unnamed places", () => {
    const places = parseElements(
      [
        { type: "node", id: 1, lat: 43.66, lon: -70.25, tags: { name: "Far", amenity: "cafe" } },
        { type: "way", id: 2, center: { lat: 43.6592, lon: -70.2569 }, tags: { name: "Near", amenity: "restaurant", cuisine: "Ramen; Japanese" } },
        { type: "node", id: 3, lat: 43.659, lon: -70.256, tags: { amenity: "restaurant" } },
      ],
      43.6591,
      -70.2568
    );
    expect(places.map((p) => p.name)).toEqual(["Near", "Far"]);
    expect(places[0].cuisines).toEqual(["ramen", "japanese"]);
    expect(places[0].id).toBe("way/2");
  });
});

describe("Gemini answer parsing", () => {
  it("reads JSON even when wrapped in a code fence", () => {
    const text = '```json\n{"headline":"Cozy night","picks":[{"name":"Ramen","emoji":"🍜","why":"Warm","cuisines":["Ramen"],"keywords":["ramen"]}]}\n```';
    const out = parseAgentAnswer(text)!;
    expect(out.headline).toBe("Cozy night");
    expect(out.picks[0].cuisines).toEqual(["ramen"]);
  });
  it("rejects answers without usable picks", () => {
    expect(parseAgentAnswer("I think you should eat soup.")).toBeNull();
    expect(parseAgentAnswer('{"picks":[{"emoji":"🍜"}]}')).toBeNull();
  });
});
