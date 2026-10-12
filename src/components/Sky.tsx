"use client";

import { useEffect, useRef } from "react";
import type { Condition } from "@/lib/types";

// Background gradients, top to bottom, picked by condition and time of day.
const GRADIENTS: Record<string, [string, string]> = {
  "clear-day": ["#2c6bb3", "#79b6e6"],
  "clear-night": ["#070f26", "#1f2f5a"],
  "clear-golden": ["#3a5f99", "#e8a172"],
  "partly-cloudy-day": ["#4677a8", "#93b8d8"],
  "partly-cloudy-night": ["#0f1830", "#2f3c5c"],
  "cloudy-day": ["#5c7082", "#9eafbd"],
  "cloudy-night": ["#1b232e", "#3a4553"],
  "fog-day": ["#78838d", "#b6bec5"],
  "fog-night": ["#262d35", "#4a535c"],
  "drizzle-day": ["#4d6072", "#8193a3"],
  "drizzle-night": ["#141c26", "#2e3b49"],
  "rain-day": ["#3b4a59", "#6d7d8c"],
  "rain-night": ["#10171f", "#283542"],
  "snow-day": ["#5a6c83", "#97a7b9"],
  "snow-night": ["#252e3e", "#4a5466"],
  "storm-day": ["#232a36", "#4a5160"],
  "storm-night": ["#0d1117", "#2a2f3a"],
};

export function skyGradient(condition: Condition, isDay: boolean, golden: boolean): [string, string] {
  if (condition === "clear" && isDay && golden) return GRADIENTS["clear-golden"];
  return GRADIENTS[`${condition}-${isDay ? "day" : "night"}`] ?? GRADIENTS["cloudy-day"];
}

interface Props {
  condition: Condition;
  isDay: boolean;
  golden?: boolean;
}

type Particle = { x: number; y: number; r: number; v: number; d: number; a: number };

/** Full-screen animated sky: sun glow, stars, drifting clouds, rain, snow and lightning. */
export default function Sky({ condition, isDay, golden = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [top, bottom] = skyGradient(condition, isDay, golden);

  // Match the page edge to the sky, so scrolling past the end doesn't flash a different color.
  useEffect(() => {
    document.documentElement.style.background = bottom;
  }, [bottom]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const wet = condition === "rain" || condition === "storm" || condition === "drizzle";
    const cloudy = condition !== "clear";
    const showStars = !isDay && (condition === "clear" || condition === "partly-cloudy");

    const drops: Particle[] = Array.from(
      { length: wet ? (condition === "drizzle" ? 70 : 160) : condition === "snow" ? 120 : 0 },
      () => ({ x: rand(0, w), y: rand(-h, h), r: rand(1, 3), v: rand(0.6, 1), d: rand(0, 6.28), a: rand(0.25, 0.7) })
    );
    const stars: Particle[] = showStars
      ? Array.from({ length: 90 }, () => ({ x: rand(0, w), y: rand(0, h * 0.6), r: rand(0.4, 1.4), v: rand(0.5, 2), d: rand(0, 6.28), a: 1 }))
      : [];
    const clouds: Particle[] = cloudy
      ? Array.from({ length: condition === "partly-cloudy" ? 4 : 7 }, (_, i) => ({
          x: rand(-0.2, 1) * w,
          y: rand(0.02, condition === "fog" ? 0.9 : 0.35) * h,
          r: rand(90, 170),
          v: rand(0.05, 0.18),
          d: i,
          a: condition === "partly-cloudy" ? 0.16 : isDay ? 0.18 : 0.1,
        }))
      : [];

    let flash = 0;
    let t = 0;

    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      if (condition === "clear" && isDay) {
        const g = ctx.createRadialGradient(w * 0.82, h * 0.06, 10, w * 0.82, h * 0.06, w * 0.75);
        g.addColorStop(0, "rgba(255,244,214,0.55)");
        g.addColorStop(0.25, "rgba(255,236,190,0.18)");
        g.addColorStop(1, "rgba(255,236,190,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      for (const s of stars) {
        const twinkle = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.02 * s.v + s.d);
        ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const c of clouds) {
        if (!reduce) c.x += c.v;
        if (c.x - c.r * 2 > w) c.x = -c.r * 2;
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r * 1.6);
        g.addColorStop(0, `rgba(255,255,255,${c.a})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.r * 1.6, c.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (wet) {
        ctx.strokeStyle = "rgba(200,220,240,0.45)";
        ctx.lineWidth = 1;
        for (const p of drops) {
          if (!reduce) {
            p.y += 11 * p.v;
            p.x -= 1.5 * p.v;
          }
          if (p.y > h) {
            p.y = rand(-40, 0);
            p.x = rand(0, w + 60);
          }
          ctx.globalAlpha = p.a;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 2 * p.v, p.y + 14 * p.v);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      if (condition === "snow") {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        for (const p of drops) {
          if (!reduce) {
            p.y += 0.9 * p.v;
            p.x += Math.sin(t * 0.01 + p.d) * 0.5;
          }
          if (p.y > h) {
            p.y = -5;
            p.x = rand(0, w);
          }
          ctx.globalAlpha = p.a;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (condition === "storm" && !reduce) {
        if (flash <= 0 && Math.random() < 0.004) flash = 14;
        if (flash > 0) {
          ctx.fillStyle = `rgba(230,235,255,${(flash / 14) * 0.35})`;
          ctx.fillRect(0, 0, w, h);
          flash -= 1;
        }
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [condition, isDay]);

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 transition-[background] duration-1000"
      style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)` }}
    >
      <canvas ref={ref} className="h-full w-full" />
    </div>
  );
}
