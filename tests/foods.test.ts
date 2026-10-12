import { describe, expect, it } from "vitest";
import { demoForecast, demoPlaces } from "@/lib/demo";
import { FOODS, feelFor, matchPlaces, mealFor, rankFoods, ruleSuggestions } from "@/lib/foods";

const hot = new Set(FOODS.filter((f) => f.temp === "hot").map((f) => f.id));
const cold = new Set(FOODS.filter((f) => f.temp === "cold").map((f) => f.id));

describe("meal and feel buckets", () => {
  it("maps local hours to meals", () => {
    expect(mealFor(7)).toBe("breakfast");
    expect(mealFor(12)).toBe("lunch");
    expect(mealFor(16)).toBe("snack");
    expect(mealFor(19)).toBe("dinner");
    expect(mealFor(23)).toBe("late");
    expect(mealFor(2)).toBe("late");
  });
  it("maps feels-like temperatures to how it feels", () => {
    expect(feelFor(-5)).toBe("freezing");
    expect(feelFor(5)).toBe("cold");
    expect(feelFor(15)).toBe("cool");
    expect(feelFor(22)).toBe("mild");
    expect(feelFor(30)).toBe("hot");
  });
});

describe("rule-based picks", () => {
  it("suggests warm food on a cold rainy evening", () => {
    const picks = ruleSuggestions(demoForecast("rain"), demoPlaces());
    expect(picks).toHaveLength(3);
    for (const p of picks) expect(hot.has(p.id)).toBe(true);
    expect(picks[0].why).toMatch(/rainy/);
  });
  it("suggests cold food on a hot sunny afternoon", () => {
    const picks = ruleSuggestions(demoForecast("sunny"), demoPlaces());
    expect(cold.has(picks[0].id)).toBe(true);
    for (const p of picks) expect(hot.has(p.id)).toBe(false);
  });
  it("fits breakfast on a snowy morning", () => {
    const ranked = rankFoods(demoForecast("snow"), demoPlaces());
    const top = ranked.slice(0, 3).map((r) => r.food);
    for (const f of top) expect(f.meals).toContain("breakfast");
  });
  it("prefers foods that are actually available nearby", () => {
    const withPlaces = rankFoods(demoForecast("rain"), demoPlaces());
    const without = rankFoods(demoForecast("rain"), []);
    const ramen = (list: typeof withPlaces) => list.find((r) => r.food.id === "ramen")!.score;
    expect(ramen(withPlaces)).toBeGreaterThan(ramen(without));
  });
  it("attaches nearby places to each pick", () => {
    for (const p of ruleSuggestions(demoForecast("rain"), demoPlaces())) {
      expect(p.places.length).toBeGreaterThan(0);
    }
  });
});

describe("matching places to a food", () => {
  const places = demoPlaces();
  it("matches by cuisine tag", () => {
    const hits = matchPlaces({ cuisines: ["ramen"] }, places);
    expect(hits.map((p) => p.name)).toContain("Harbor Noodle Bar");
  });
  it("ranks the specific place above a merely related one", () => {
    expect(matchPlaces({ cuisines: ["ramen", "japanese"], nameWords: ["ramen"] }, places)[0].name).toBe("Harbor Noodle Bar");
    expect(matchPlaces({ cuisines: ["sushi", "japanese"], nameWords: ["sushi"] }, places)[0].name).toBe("Fore River Sushi");
  });
  it("does not send a coffee craving to a bubble tea shop", () => {
    const hits = matchPlaces({ cuisines: ["coffee_shop", "tea"], kinds: ["cafe"] }, places).map((p) => p.name);
    expect(hits).toContain("Copper Kettle Café");
    expect(hits).not.toContain("Pearl Tea Bar");
  });
  it("matches by place kind", () => {
    const hits = matchPlaces({ cuisines: [], kinds: ["ice_cream"] }, places);
    expect(hits.map((p) => p.name)).toEqual(["Sweet Wave Creamery"]);
  });
  it("matches by words in the name", () => {
    const hits = matchPlaces({ cuisines: [], nameWords: ["lobster"] }, places);
    expect(hits.map((p) => p.name)).toContain("Old Port Lobster Shack");
  });
});
