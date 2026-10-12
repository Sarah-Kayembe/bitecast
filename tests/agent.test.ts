import { afterEach, describe, expect, it, vi } from "vitest";
import { geminiSuggestions } from "@/lib/agent";
import { demoForecast, demoPlaces } from "@/lib/demo";

type Body = { contents: { role: string; parts: Record<string, unknown>[] }[] };

function reply(parts: Record<string, unknown>[]) {
  return new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts } }] }), { status: 200 });
}

afterEach(() => vi.unstubAllGlobals());

describe("Gemini function-calling loop", () => {
  it("runs the tools Gemini asks for and returns its picks with nearby places", async () => {
    const seen: Body[] = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as Body;
      seen.push(body);
      if (seen.length === 1) {
        return reply([{ functionCall: { name: "get_weather", args: {} } }, { functionCall: { name: "nearby_cuisines", args: {} } }]);
      }
      if (seen.length === 2) {
        return reply([{ functionCall: { name: "find_places", args: { dish: "ramen", cuisines: ["ramen"], keywords: ["ramen"] } } }]);
      }
      return reply([
        {
          text: JSON.stringify({
            headline: "A rainy night calls for something steamy.",
            picks: [
              { name: "Tonkotsu Ramen", emoji: "🍜", why: "Rich broth beats the 41°F chill.", cuisines: ["ramen"], keywords: ["ramen"] },
              { name: "Clam Chowder", emoji: "🥣", why: "Creamy and warm.", cuisines: ["seafood"], keywords: ["chowder"] },
              { name: "Chicken Tikka Masala", emoji: "🍛", why: "Spice warms you up.", cuisines: ["indian"], keywords: ["masala"] },
            ],
          }),
        },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = await geminiSuggestions(demoForecast("rain"), demoPlaces(), "F", "test-key", "test-model");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    // The weather tool answered in Fahrenheit, and the cuisine tool saw the real places.
    const toolTurn = seen[1].contents.at(-1)!.parts as { functionResponse: { name: string; response: Record<string, unknown> } }[];
    expect(toolTurn[0].functionResponse.response.temperature).toBe("46°F");
    expect(toolTurn[1].functionResponse.response.totalPlaces).toBe(demoPlaces().length);
    const findTurn = seen[2].contents.at(-1)!.parts as { functionResponse: { response: { found: number } } }[];
    expect(findTurn[0].functionResponse.response.found).toBeGreaterThan(0);

    expect(out.headline).toMatch(/rainy/);
    expect(out.picks.map((p) => p.name)).toEqual(["Tonkotsu Ramen", "Clam Chowder", "Chicken Tikka Masala"]);
    expect(out.picks[0].places[0].name).toBe("Harbor Noodle Bar");
    expect(out.picks[1].places[0].name).toBe("Wharf Street Chowder Co.");
  });

  it("throws on a bad answer so the app can fall back to rule-based picks", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply([{ text: "Soup!" }])));
    await expect(geminiSuggestions(demoForecast("rain"), demoPlaces(), "F", "k", "m")).rejects.toThrow();
  });

  it("throws when Gemini returns an error status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 429 })));
    await expect(geminiSuggestions(demoForecast("rain"), demoPlaces(), "F", "k", "m")).rejects.toThrow(/429/);
  });
});
