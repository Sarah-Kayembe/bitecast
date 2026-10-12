"use client";

import type { ReactNode } from "react";
import { iconFor } from "@/lib/conditions";
import { clockLabel, dayLabel, deg, hourLabel, temp, wind, type Unit } from "@/lib/format";
import type { FoodPick, Forecast, Suggestions } from "@/lib/types";

export function Card({ title, icon, right, children }: { title: string; icon: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass rounded-2xl px-4 pb-3 pt-2.5">
      <header className="flex items-center justify-between border-b border-white/15 pb-2">
        <h2 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-white/60">
          <span aria-hidden>{icon}</span>
          {title}
        </h2>
        {right}
      </header>
      {children}
    </section>
  );
}

export function CravingCard({
  data,
  loading,
  error,
  onPick,
  onRetry,
}: {
  data: Suggestions | null;
  loading: boolean;
  error: string | null;
  onPick: (pick: FoodPick) => void;
  onRetry: () => void;
}) {
  const badge = data ? (
    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/80">
      {data.source === "gemini" ? "✦ Gemini" : "Smart picks"}
    </span>
  ) : null;

  return (
    <Card title="Craving Forecast" icon="🍽️" right={badge}>
      {loading && !data && (
        <div className="space-y-3 pt-3" aria-label="Finding food that fits the weather">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-white/15" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-white/20" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && !data && (
        <div className="pt-3 text-[15px] text-white/85">
          <p>{error}</p>
          <button onClick={onRetry} className="mt-2 rounded-full bg-white/20 px-3 py-1 text-[13px] font-semibold">
            Try again
          </button>
        </div>
      )}
      {data && (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <p className="pt-2.5 text-[15px] leading-snug text-white/90">{data.headline}</p>
          <ul className="mt-1">
            {data.picks.map((p) => (
              <li key={p.id} className="border-b border-white/10 last:border-0">
                <button
                  onClick={() => onPick(p)}
                  className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-70"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 text-2xl" aria-hidden>
                    {p.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold">{p.name}</span>
                    <span className="block text-[13px] leading-snug text-white/70">{p.why}</span>
                  </span>
                  <span className="shrink-0 text-right text-[12px] text-white/60">
                    {p.places.length > 0 ? `${p.places.length} nearby` : "Delivery"}
                    <span className="ml-1 text-white/40" aria-hidden>›</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function HourlyCard({ f, unit }: { f: Forecast; unit: Unit }) {
  const next = f.hourly.slice(1, 7);
  const wetHour = next.find((h) => h.precipChance >= 50);
  const summary = wetHour
    ? `${f.current.condition === "snow" || wetHour.condition === "snow" ? "Snow" : "Rain"} likely around ${hourLabel(wetHour.time)}. Wind ${wind(f.current.windKph, unit)}.`
    : `${f.current.label} conditions expected. Wind ${wind(f.current.windKph, unit)}.`;
  return (
    <Card title="Hourly Forecast" icon="🕒">
      <p className="border-b border-white/15 py-2 text-[15px] text-white/90">{summary}</p>
      <div className="no-scrollbar -mx-1 flex overflow-x-auto pt-2">
        {f.hourly.slice(0, 25).map((h, i) => (
          <div key={h.time} className="flex w-14 shrink-0 flex-col items-center gap-1.5 py-1">
            <span className="text-[13px] font-semibold">{i === 0 ? "Now" : hourLabel(h.time)}</span>
            <span className="flex h-8 flex-col items-center justify-center text-xl leading-none">
              {iconFor(h.condition, h.isDay)}
              {h.precipChance >= 30 && <span className="mt-0.5 text-[10px] font-semibold text-sky-200">{h.precipChance}%</span>}
            </span>
            <span className="text-[17px] font-medium">{deg(i === 0 ? f.current.tempC : h.tempC, unit)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DailyCard({ f, unit }: { f: Forecast; unit: Unit }) {
  const lo = Math.min(...f.daily.map((d) => d.minC));
  const hi = Math.max(...f.daily.map((d) => d.maxC));
  const span = Math.max(1, hi - lo);
  return (
    <Card title="10-Day Forecast" icon="📅">
      <ul>
        {f.daily.map((d, i) => {
          const left = ((d.minC - lo) / span) * 100;
          const width = Math.max(6, ((d.maxC - d.minC) / span) * 100);
          return (
            <li key={d.date} className="flex items-center gap-2 border-b border-white/10 py-2.5 last:border-0">
              <span className="w-12 text-[17px] font-medium">{dayLabel(d.date, i)}</span>
              <span className="flex w-10 flex-col items-center text-xl leading-none">
                {iconFor(d.condition, true)}
                {d.precipChance >= 40 && <span className="text-[10px] font-semibold text-sky-200">{d.precipChance}%</span>}
              </span>
              <span className="w-9 text-right text-[17px] text-white/55 tabular-nums">{temp(d.minC, unit)}°</span>
              <span className="relative mx-1 h-1 flex-1 rounded-full bg-black/20">
                <span
                  className="absolute h-1 rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: "linear-gradient(90deg, #8fd3f4, #f7d070, #f39a5a)",
                  }}
                />
              </span>
              <span className="w-9 text-[17px] tabular-nums">{temp(d.maxC, unit)}°</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Tile({ icon, title, value, note }: { icon: string; title: string; value: string; note: string }) {
  return (
    <div className="glass flex aspect-square flex-col rounded-2xl p-3.5">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-white/60">
        <span aria-hidden>{icon}</span> {title}
      </h3>
      <p className="mt-1 text-[32px] font-normal leading-tight">{value}</p>
      <p className="mt-auto text-[13px] leading-snug text-white/80">{note}</p>
    </div>
  );
}

export function DetailTiles({ f, unit }: { f: Forecast; unit: Unit }) {
  const c = f.current;
  const diff = temp(c.feelsLikeC, unit) - temp(c.tempC, unit);
  const feelNote =
    diff <= -2 ? "Wind is making it feel colder." : diff >= 2 ? "Humidity is making it feel warmer." : "Similar to the actual temperature.";
  const sunEvent = c.isDay ? { label: "Sunset", at: f.sunset } : { label: "Sunrise", at: f.sunrise };
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile icon="🌡️" title="Feels Like" value={deg(c.feelsLikeC, unit)} note={feelNote} />
      <Tile icon="💧" title="Humidity" value={`${Math.round(c.humidity)}%`} note={c.humidity > 80 ? "Damp out there." : "Comfortable."} />
      <Tile icon="🌬️" title="Wind" value={wind(c.windKph, unit)} note={c.windKph >= 30 ? "Hold onto your takeout." : c.windKph >= 12 ? "Breezy out there." : "Light breeze."} />
      <Tile icon={c.isDay ? "🌇" : "🌅"} title={sunEvent.label} value={clockLabel(sunEvent.at)} note={c.isDay ? "Golden hour before then." : "Breakfast is closer than you think."} />
    </div>
  );
}
