"use client";

import { useEffect, useRef } from "react";

const R = 92;
const C = 2 * Math.PI * R;

export default function Bomb({
  syllable,
  turnEndsAt,
  turnDuration,
  serverNow,
  shaking,
}: {
  syllable: string;
  turnEndsAt: number;
  turnDuration: number;
  serverNow: () => number;
  shaking: boolean;
}) {
  const ringRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const left = turnEndsAt - serverNow();
      const frac =
        turnDuration > 0 ? Math.max(0, Math.min(1, left / turnDuration)) : 0;
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(C * (1 - frac));
        ringRef.current.style.stroke =
          frac > 0.5
            ? "var(--color-neon-mint)"
            : frac > 0.25
              ? "var(--color-neon-gold)"
              : "var(--color-neon-red)";
      }
      if (numRef.current) {
        numRef.current.textContent = Math.max(0, left / 1000).toFixed(1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [turnEndsAt, turnDuration, serverNow]);

  return (
    <div className="relative grid place-items-center pb-12">
      <svg viewBox="0 0 220 220" className="h-60 w-60 -rotate-90">
        <circle
          cx="110"
          cy="110"
          r={R}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="10"
        />
        <circle
          ref={ringRef}
          cx="110"
          cy="110"
          r={R}
          fill="none"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={0}
          stroke="var(--color-neon-mint)"
        />
      </svg>

      <div
        className={
          "absolute top-1/2 left-1/2 grid h-40 w-40 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full " +
          (shaking ? "anim-shake" : "")
        }
        style={{
          background: "radial-gradient(circle at 35% 28%, #322a52, #0b0916)",
          boxShadow:
            "inset 0 0 32px rgba(0,0,0,.85), 0 0 46px -6px var(--color-neon-purple)",
        }}
      >
        <div className="absolute -top-4 text-3xl">🧨</div>
        <span className="font-display text-5xl text-white glow-text">
          {syllable || "··"}
        </span>
      </div>

      <div
        ref={numRef}
        className="absolute bottom-0 font-display text-3xl text-white/85"
      >
        0.0
      </div>
    </div>
  );
}
