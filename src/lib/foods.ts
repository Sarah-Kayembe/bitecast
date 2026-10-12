import { isWet } from "./conditions";
import type { Condition, FoodPick, Forecast, Place } from "./types";

export type Meal = "breakfast" | "lunch" | "snack" | "dinner" | "late";

export interface Food {
  id: string;
  name: string;
  emoji: string;
  /** OpenStreetMap cuisine=* values that serve it. */
  cuisines: string[];
  /** OpenStreetMap amenity=* or shop=* kinds that serve it. */
  kinds?: string[];
  /** Words that give it away in a place name, e.g. "ramen". */
  nameWords?: string[];
  temp: "hot" | "cold" | "any";
  hearty?: boolean;
  brothy?: boolean;
  meals: Meal[];
  pitch: string;
}

export const FOODS: Food[] = [
  { id: "ramen", name: "Ramen", emoji: "🍜", cuisines: ["ramen", "japanese", "noodle"], nameWords: ["ramen"], temp: "hot", hearty: true, brothy: true, meals: ["lunch", "dinner", "late"], pitch: "a steaming bowl of broth and noodles warms you right up" },
  { id: "pho", name: "Pho", emoji: "🍲", cuisines: ["vietnamese", "pho"], nameWords: ["pho"], temp: "hot", brothy: true, meals: ["lunch", "dinner"], pitch: "fragrant broth with herbs is made for this kind of day" },
  { id: "soup", name: "Soup or Chowder", emoji: "🥣", cuisines: ["soup", "seafood"], nameWords: ["soup", "chowder"], temp: "hot", brothy: true, meals: ["lunch", "dinner"], pitch: "something you can wrap both hands around" },
  { id: "curry", name: "Curry", emoji: "🍛", cuisines: ["indian", "thai", "curry", "nepalese", "pakistani"], nameWords: ["curry", "masala"], temp: "hot", hearty: true, meals: ["lunch", "dinner"], pitch: "warm spices and rice hit the spot" },
  { id: "dumplings", name: "Dumplings", emoji: "🥟", cuisines: ["chinese", "dumpling", "dim_sum", "nepalese"], nameWords: ["dumpling", "dim sum", "momo"], temp: "hot", meals: ["lunch", "dinner", "late"], pitch: "little warm parcels that are easy to share" },
  { id: "pizza", name: "Pizza", emoji: "🍕", cuisines: ["pizza"], nameWords: ["pizza", "pizzeria"], temp: "hot", hearty: true, meals: ["lunch", "dinner", "late"], pitch: "a hot slice is the classic stay-in move" },
  { id: "pasta", name: "Pasta", emoji: "🍝", cuisines: ["italian", "pasta"], nameWords: ["pasta", "trattoria"], temp: "hot", hearty: true, meals: ["dinner"], pitch: "a cozy plate of pasta feels just right" },
  { id: "burger", name: "Burger and Fries", emoji: "🍔", cuisines: ["burger", "american"], nameWords: ["burger"], temp: "any", hearty: true, meals: ["lunch", "dinner", "late"], pitch: "a dependable crowd pleaser in any weather" },
  { id: "tacos", name: "Tacos", emoji: "🌮", cuisines: ["mexican", "tex-mex", "tacos"], nameWords: ["taco", "taqueria", "burrito"], temp: "any", meals: ["lunch", "dinner", "late"], pitch: "bright, quick and easy to eat on the go" },
  { id: "bbq", name: "Barbecue", emoji: "🍖", cuisines: ["barbecue", "bbq"], nameWords: ["bbq", "barbecue", "smokehouse"], temp: "any", hearty: true, meals: ["lunch", "dinner"], pitch: "smoky and filling, great with company" },
  { id: "sandwich", name: "Sandwich", emoji: "🥪", cuisines: ["sandwich", "deli", "bagel"], kinds: ["deli"], nameWords: ["sandwich", "deli", "sub"], temp: "any", meals: ["lunch"], pitch: "an easy lunch that travels well" },
  { id: "sushi", name: "Sushi", emoji: "🍣", cuisines: ["sushi", "japanese"], nameWords: ["sushi"], temp: "cold", meals: ["lunch", "dinner"], pitch: "fresh and light when it's warm out" },
  { id: "poke", name: "Poke Bowl", emoji: "🐟", cuisines: ["poke", "hawaiian"], nameWords: ["poke"], temp: "cold", meals: ["lunch", "dinner"], pitch: "cool, fresh and filling without feeling heavy" },
  { id: "salad", name: "Salad", emoji: "🥗", cuisines: ["salad", "healthy", "vegan", "vegetarian"], nameWords: ["salad", "greens"], temp: "cold", meals: ["lunch"], pitch: "crisp and light for a warm afternoon" },
  { id: "lobster-roll", name: "Lobster Roll", emoji: "🦞", cuisines: ["seafood", "lobster"], nameWords: ["lobster", "clam shack"], temp: "cold", meals: ["lunch", "dinner"], pitch: "a summer favorite best eaten outside" },
  { id: "ice-cream", name: "Ice Cream", emoji: "🍦", cuisines: ["ice_cream", "frozen_yogurt", "gelato"], kinds: ["ice_cream"], nameWords: ["ice cream", "gelato", "creamery"], temp: "cold", meals: ["snack", "dinner", "late"], pitch: "the obvious answer when it's this warm" },
  { id: "bubble-tea", name: "Bubble Tea", emoji: "🧋", cuisines: ["bubble_tea"], nameWords: ["boba", "bubble tea"], temp: "cold", meals: ["snack"], pitch: "an icy, chewy afternoon pick-me-up" },
  { id: "smoothie", name: "Smoothie", emoji: "🥤", cuisines: ["juice", "smoothie"], nameWords: ["smoothie", "juice"], temp: "cold", meals: ["breakfast", "snack"], pitch: "cold, fruity and refreshing" },
  { id: "hot-drink", name: "Hot Chocolate or Latte", emoji: "☕", cuisines: ["coffee_shop", "tea"], kinds: ["cafe"], nameWords: ["coffee", "café", "cafe", "espresso"], temp: "hot", meals: ["breakfast", "snack", "late"], pitch: "a warm mug and a seat by the window" },
  { id: "pastry", name: "Fresh Pastry", emoji: "🥐", cuisines: ["bakery", "pastry"], kinds: ["bakery", "pastry"], nameWords: ["bakery", "boulangerie", "patisserie"], temp: "any", meals: ["breakfast", "snack"], pitch: "something warm from the oven" },
  { id: "breakfast", name: "Pancakes and Eggs", emoji: "🥞", cuisines: ["breakfast", "diner", "brunch"], nameWords: ["diner", "breakfast", "pancake", "brunch"], temp: "any", hearty: true, meals: ["breakfast"], pitch: "a proper sit-down breakfast" },
];

export function mealFor(localHour: number): Meal {
  if (localHour >= 5 && localHour < 11) return "breakfast";
  if (localHour >= 11 && localHour < 15) return "lunch";
  if (localHour >= 15 && localHour < 17) return "snack";
  if (localHour >= 17 && localHour < 22) return "dinner";
  return "late";
}

export type Feel = "freezing" | "cold" | "cool" | "mild" | "hot";

export function feelFor(feelsLikeC: number): Feel {
  if (feelsLikeC < 0) return "freezing";
  if (feelsLikeC < 10) return "cold";
  if (feelsLikeC < 18) return "cool";
  if (feelsLikeC < 26) return "mild";
  return "hot";
}

export type Matchable = Pick<Food, "cuisines" | "kinds" | "nameWords">;

/** Places that plausibly serve a food, nearest first. */
export function matchPlaces(food: Matchable, places: Place[], limit = 5): Place[] {
  const words = (food.nameWords ?? []).map((w) => w.toLowerCase());
  const [primary, ...secondary] = food.cuisines;

  // How sure we are that a place serves the dish. A ramen shop is a better
  // answer for "ramen" than a sushi bar that is merely also Japanese.
  const strength = (p: Place): number => {
    let s = 0;
    const name = p.name.toLowerCase();
    if (words.some((w) => name.includes(w))) s += 3;
    if (primary && p.cuisines.includes(primary)) s += 2;
    if (p.cuisines.some((c) => secondary.includes(c))) s += 1;
    // A place kind (like any café) only counts when the place has no more
    // specific cuisine pointing somewhere else.
    const plain = p.cuisines.length === 0 || p.cuisines.includes(p.kind);
    if (food.kinds?.includes(p.kind) && (plain || s > 0)) s += 1;
    return s;
  };

  return places
    .map((p) => ({ p, s: strength(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.distanceM - b.p.distanceM)
    .slice(0, limit)
    .map((x) => x.p);
}

const HOT_SCORE: Record<Feel, number> = { freezing: 4, cold: 3, cool: 2, mild: 0, hot: -3 };
const COLD_SCORE: Record<Feel, number> = { freezing: -4, cold: -3, cool: -1, mild: 1, hot: 4 };

export interface Scored {
  food: Food;
  score: number;
  places: Place[];
}

/** Rule-based ranking. Used on its own when Gemini is not configured. */
export function rankFoods(forecast: Forecast, places: Place[]): Scored[] {
  const feel = feelFor(forecast.current.feelsLikeC);
  const wet = isWet(forecast.current.condition) || forecast.current.condition === "snow";
  const meal = mealFor(Number(forecast.localTime.slice(11, 13)));

  return FOODS.map((food) => {
    let score = 0;
    if (food.temp === "hot") score += HOT_SCORE[feel];
    if (food.temp === "cold") score += COLD_SCORE[feel];
    if (wet) {
      if (food.brothy) score += 2;
      if (food.hearty) score += 1;
      if (food.temp === "cold") score -= 1;
    }
    // Time of day matters more than weather: nobody wants ramen at 8am.
    score += food.meals.includes(meal) ? 3 : -5;
    const nearby = matchPlaces(food, places);
    score += nearby.length === 0 ? -1.5 : Math.min(2, 1 + nearby.length * 0.25);
    return { food, score, places: nearby };
  }).sort((a, b) => b.score - a.score);
}

const CONDITION_WORDS: Record<Condition, string> = {
  clear: "clear",
  "partly-cloudy": "partly cloudy",
  cloudy: "gray",
  fog: "foggy",
  drizzle: "drizzly",
  rain: "rainy",
  snow: "snowy",
  storm: "stormy",
};

const FEEL_WORDS: Record<Feel, string> = {
  freezing: "Freezing",
  cold: "Cold",
  cool: "Cool",
  mild: "Mild",
  hot: "Hot",
};

export function weatherPhrase(forecast: Forecast): string {
  const feel = feelFor(forecast.current.feelsLikeC);
  const cond = forecast.current.condition;
  if (cond === "clear" && !forecast.current.isDay) return `${FEEL_WORDS[feel]} and clear tonight`;
  if (cond === "clear") return `${FEEL_WORDS[feel]} and sunny`;
  return `${FEEL_WORDS[feel]} and ${CONDITION_WORDS[cond]}`;
}

export function ruleSuggestions(forecast: Forecast, places: Place[], count = 3): FoodPick[] {
  const ranked = rankFoods(forecast, places);
  const phrase = weatherPhrase(forecast);
  return ranked.slice(0, count).map(({ food, places: nearby }) => ({
    id: food.id,
    name: food.name,
    emoji: food.emoji,
    why: `${phrase}, so ${food.pitch}.`,
    places: nearby,
  }));
}
