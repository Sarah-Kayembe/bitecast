"use client";

import { useCallback, useEffect, useState } from "react";
import { CravingCard, DailyCard, DetailTiles, HourlyCard } from "@/components/Cards";
import { PlacesSheet, SearchSheet, type City } from "@/components/Sheets";
import Sky from "@/components/Sky";
import { defaultUnit, deg, type Unit } from "@/lib/format";
import type { FoodPick, Forecast, Suggestions } from "@/lib/types";

type Where = { lat: number; lon: number; name?: string } | null;

const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode */
    }
  },
};

function isGolden(f: Forecast): boolean {
  if (!f.sunset || !f.current.isDay) return false;
  const now = Number(f.localTime.slice(11, 13)) * 60 + Number(f.localTime.slice(14, 16));
  const set = Number(f.sunset.slice(11, 13)) * 60 + Number(f.sunset.slice(14, 16));
  return set - now >= 0 && set - now <= 60;
}

export default function Home() {
  const [demo, setDemo] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>("F");
  const [where, setWhere] = useState<Where>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [food, setFood] = useState<Suggestions | null>(null);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodError, setFoodError] = useState<string | null>(null);
  const [pick, setPick] = useState<FoodPick | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  // Start-up: units, demo mode, then the last place or the device location.
  useEffect(() => {
    const saved = store.get("bitecast:unit");
    setUnit(saved === "C" || saved === "F" ? saved : defaultUnit());
    const params = new URLSearchParams(window.location.search);
    const d = params.get("demo");
    if (d) {
      setDemo(d);
      setWhere({ lat: 0, lon: 0 });
      return;
    }
    const last = store.get("bitecast:place");
    if (last) {
      try {
        setWhere(JSON.parse(last));
        return;
      } catch {
        /* fall through to location */
      }
    }
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setSearching(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        store.set("bitecast:place", JSON.stringify(next));
        setWhere(next);
      },
      () => {
        setLocating(false);
        setWeatherError("Location is off. Search for a city to see what to eat there.");
        setSearching(true);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  }, []);

  // Weather for the chosen place.
  useEffect(() => {
    if (!where) return;
    const params = new URLSearchParams(
      demo ? { demo } : { lat: String(where.lat), lon: String(where.lon), ...(where.name ? { name: where.name } : {}) }
    );
    setWeatherError(null);
    fetch(`/api/weather?${params}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Weather is unavailable right now.");
        setForecast(data);
      })
      .catch((e) => setWeatherError(e.message));
  }, [where, demo]);

  // Food picks for the chosen place, in the chosen unit.
  const loadFood = useCallback(() => {
    if (!where) return;
    setFoodLoading(true);
    setFoodError(null);
    fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: where.lat, lon: where.lon, unit, demo }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Couldn't load food picks.");
        setFood(data);
      })
      .catch((e) => setFoodError(e.message))
      .finally(() => setFoodLoading(false));
  }, [where, unit, demo]);

  useEffect(() => {
    loadFood();
  }, [loadFood]);

  const chooseCity = (c: City) => {
    const next = { lat: c.lat, lon: c.lon, name: c.name };
    store.set("bitecast:place", JSON.stringify(next));
    setSearching(false);
    setForecast(null);
    setFood(null);
    setDemo(null);
    setWhere(next);
  };

  const toggleUnit = () => {
    const next = unit === "F" ? "C" : "F";
    setUnit(next);
    store.set("bitecast:unit", next);
  };

  const f = forecast;
  const today = f?.daily[0];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-3 px-4 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
      <Sky condition={f?.current.condition ?? "partly-cloudy"} isDay={f?.current.isDay ?? true} golden={f ? isGolden(f) : false} />

      <nav className="flex items-center justify-between">
        <button onClick={toggleUnit} className="glass rounded-full px-3 py-1 text-[13px] font-semibold" aria-label="Switch temperature unit">
          °{unit === "F" ? "F" : "C"} <span className="text-white/50">/ °{unit === "F" ? "C" : "F"}</span>
        </button>
        {f?.demo && <span className="glass rounded-full px-3 py-1 text-[12px] font-semibold text-white/80">Demo data</span>}
        <button onClick={() => setSearching(true)} className="glass grid h-8 w-8 place-items-center rounded-full" aria-label="Search for a city">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </nav>

      <header className="pb-6 pt-8 text-center drop-shadow-[0_1px_8px_rgba(0,0,0,0.15)]">
        {f ? (
          <>
            {!where?.name && (
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/80">My Location</p>
            )}
            <h1 className="text-[32px] font-normal leading-tight">{f.place}</h1>
            <p className="text-[96px] font-extralight leading-none tracking-tighter">
              {deg(f.current.tempC, unit)}
            </p>
            <p className="text-[20px] font-medium text-white/90">{f.current.label}</p>
            {today && (
              <p className="text-[20px] font-medium">
                H:{deg(today.maxC, unit)} &nbsp;L:{deg(today.minC, unit)}
              </p>
            )}
          </>
        ) : (
          <div className="pt-6">
            <h1 className="text-[34px] font-semibold">BiteCast</h1>
            <p className="mt-1 text-[17px] text-white/85">
              {weatherError ?? (locating ? "Finding where you are…" : "Loading the weather…")}
            </p>
            {weatherError && (
              <button onClick={() => setSearching(true)} className="glass mt-4 rounded-full px-4 py-2 text-[15px] font-semibold">
                Search for a city
              </button>
            )}
          </div>
        )}
      </header>

      {f && (
        <>
          <CravingCard data={food} loading={foodLoading} error={foodError} onPick={setPick} onRetry={loadFood} />
          <HourlyCard f={f} unit={unit} />
          <DailyCard f={f} unit={unit} />
          <DetailTiles f={f} unit={unit} />
          <footer className="px-2 pt-3 text-center text-[11px] leading-relaxed text-white/60">
            Weather from Open-Meteo. Places © OpenStreetMap contributors.
            <br />
            {food?.source === "gemini" ? "Food picks by Google Gemini." : "Food picks by BiteCast's weather rules."}
            {f.demo && (
              <>
                <br />
                Demo mode uses sample weather and made-up places.
              </>
            )}
          </footer>
        </>
      )}

      <PlacesSheet pick={pick} unit={unit} city={f?.place ?? ""} onClose={() => setPick(null)} />
      <SearchSheet
        open={searching}
        onClose={() => setSearching(false)}
        onPick={chooseCity}
        onUseLocation={() => {
          setSearching(false);
          setDemo(null);
          setForecast(null);
          setFood(null);
          locate();
        }}
      />
    </main>
  );
}
