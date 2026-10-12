"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cuisineLabel, deliveryLink, distance, mapsLink, type Unit } from "@/lib/format";
import type { FoodPick } from "@/lib/types";

function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={label}>
      <button aria-label="Close" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sheet relative max-h-[82vh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 text-white">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/30" />
        {children}
      </div>
    </div>
  );
}

export function PlacesSheet({
  pick,
  unit,
  city,
  onClose,
}: {
  pick: FoodPick | null;
  unit: Unit;
  city: string;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!pick} onClose={onClose} label={pick ? `Places for ${pick.name}` : "Places"}>
      {pick && (
        <>
          <div className="flex items-start gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-3xl" aria-hidden>
              {pick.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] font-semibold leading-tight">{pick.name}</h2>
              <p className="text-[14px] leading-snug text-white/75">{pick.why}</p>
            </div>
            <button onClick={onClose} className="rounded-full bg-white/15 px-2.5 py-1 text-[13px] font-semibold">
              Done
            </button>
          </div>

          <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-white/60">
            {pick.places.length > 0 ? "Nearby" : "Nothing found nearby"}
          </h3>
          {pick.places.length === 0 && (
            <p className="mt-1 text-[14px] text-white/75">
              No places tagged for {pick.name.toLowerCase()} on OpenStreetMap near you. A delivery app may still have it.
            </p>
          )}
          <ul className="mt-1">
            {pick.places.map((p) => (
              <li key={p.id} className="border-b border-white/10 py-3 last:border-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[17px] font-semibold">{p.name}</span>
                  <span className="shrink-0 text-[14px] tabular-nums text-white/70">{distance(p.distanceM, unit)}</span>
                </div>
                <p className="text-[13px] text-white/65">
                  {cuisineLabel(p.cuisines, p.kind)}
                  {p.address ? ` · ${p.address}` : ""}
                </p>
                {p.openingHours && <p className="truncate text-[12px] text-white/50">Hours: {p.openingHours}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <a className="pill" href={mapsLink(p.name, p.lat, p.lon)} target="_blank" rel="noreferrer">
                    Directions
                  </a>
                  {p.website && (
                    <a className="pill" href={p.website} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  )}
                  <a className="pill" href={deliveryLink(p.name, city)} target="_blank" rel="noreferrer">
                    Find delivery
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <a
            className="pill mt-3 inline-block"
            href={`https://www.google.com/search?q=${encodeURIComponent(`${pick.name} delivery ${city}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            Search delivery for {pick.name.toLowerCase()}
          </a>
          <p className="mt-4 text-[11px] text-white/45">Places from © OpenStreetMap contributors.</p>
        </>
      )}
    </Sheet>
  );
}

export interface City {
  name: string;
  region: string;
  countryCode: string;
  lat: number;
  lon: number;
}

export function SearchSheet({
  open,
  onClose,
  onPick,
  onUseLocation,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (c: City) => void;
  onUseLocation: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        /* typing again cancels the request */
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <Sheet open={open} onClose={onClose} label="Search for a city">
      <div className="flex items-center gap-2">
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for a city"
          className="h-10 flex-1 rounded-xl bg-white/15 px-3 text-[17px] text-white placeholder:text-white/50 outline-none focus:bg-white/20"
          aria-label="City name"
        />
        <button onClick={onClose} className="text-[17px] text-white/80">
          Cancel
        </button>
      </div>
      <button onClick={onUseLocation} className="mt-3 flex items-center gap-2 text-[15px] font-semibold text-sky-200">
        <span aria-hidden>➤</span> Use my current location
      </button>
      <ul className="mt-2">
        {busy && results.length === 0 && <li className="py-3 text-white/60">Searching…</li>}
        {results.map((c) => (
          <li key={`${c.lat},${c.lon}`}>
            <button
              onClick={() => onPick(c)}
              className="w-full border-b border-white/10 py-3 text-left active:opacity-70"
            >
              <span className="block text-[17px] font-semibold">{c.name}</span>
              <span className="block text-[13px] text-white/60">{c.region}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
