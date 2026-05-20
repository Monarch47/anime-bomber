"use client";

import { useState } from "react";
import type { GameSocket } from "@/hooks/useGameSocket";
import type {
  Difficulty,
  RoomSettings,
  WordPool,
} from "@/server/game/protocol";

const SPEEDS = {
  chill: { turnMin: 9, turnMax: 16 },
  normal: { turnMin: 7, turnMax: 13 },
  fast: { turnMin: 5, turnMax: 9 },
} as const;
type SpeedKey = keyof typeof SPEEDS;

function speedOf(s: RoomSettings): SpeedKey {
  if (s.turnMin >= 9) return "chill";
  if (s.turnMin <= 5) return "fast";
  return "normal";
}

function Pills<T extends string | number>(props: {
  label: string;
  value: T;
  disabled: boolean;
  options: { value: T; label: string }[];
  onPick: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-white/55">
        {props.label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {props.options.map((o) => {
          const active = o.value === props.value;
          return (
            <button
              key={String(o.value)}
              disabled={props.disabled || active}
              onClick={() => props.onPick(o.value)}
              className={[
                "rounded-lg px-3 py-1.5 text-sm transition",
                active
                  ? "bg-neon-purple text-white shadow-[0_0_18px_-4px_var(--color-neon-purple)]"
                  : "border border-line bg-ink-soft text-white/65 enabled:hover:border-neon-purple disabled:opacity-45",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LobbyScreen({ sock }: { sock: GameSocket }) {
  const room = sock.room!;
  const isHost = room.hostId === sock.youId;
  const s = room.settings;
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?room=${room.code}`
      : `/?room=${room.code}`;

  const setSettings = (partial: Partial<RoomSettings>) => {
    if (isHost) sock.send({ type: "setSettings", settings: partial });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const canStart = isHost && room.players.length >= 2;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <button
          onClick={sock.leaveRoom}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-white/70 hover:border-neon-red hover:text-neon-red"
        >
          ← Leave
        </button>
        <h1 className="font-display text-2xl">
          Room{" "}
          <span className="tracking-[0.2em] text-neon-cyan glow-text">
            {room.code}
          </span>
        </h1>
        <div className="w-20" />
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={shareUrl}
          className="scroll-thin flex-1 rounded-xl border border-line bg-ink-soft px-3 py-2 text-sm text-white/60"
        />
        <button
          onClick={copy}
          className="whitespace-nowrap rounded-xl border border-neon-cyan bg-neon-cyan/10 px-4 py-2 text-sm font-bold text-neon-cyan"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel/70 p-4">
          <h2 className="mb-2 font-display text-lg">
            Players <span className="text-white/40">({room.players.length})</span>
          </h2>
          <ul className="space-y-1.5">
            {room.players.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-lg bg-ink-soft px-3 py-2 text-sm"
              >
                <span
                  className={p.connected ? "text-neon-mint" : "text-white/30"}
                >
                  ●
                </span>
                <span className="flex-1 truncate">{p.name}</span>
                {p.id === sock.youId && (
                  <span className="rounded-full bg-neon-pink px-2 py-0.5 text-[10px] font-bold">
                    YOU
                  </span>
                )}
                {p.isHost && <span title="Host">👑</span>}
              </li>
            ))}
          </ul>
          {room.players.length < 2 && (
            <p className="mt-2 text-xs text-neon-gold">
              Waiting for more players — share the link above.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-line bg-panel/70 p-4">
          <h2 className="font-display text-lg">
            Settings{" "}
            {!isHost && (
              <span className="text-xs text-white/40">(host controls)</span>
            )}
          </h2>
          <Pills
            label="Starting hearts"
            value={s.startLives}
            disabled={!isHost}
            options={[1, 2, 3, 4, 5].map((n) => ({
              value: n,
              label: String(n),
            }))}
            onPick={(v) => setSettings({ startLives: v })}
          />
          <Pills<SpeedKey>
            label="Bomb speed"
            value={speedOf(s)}
            disabled={!isHost}
            options={[
              { value: "chill", label: "Chill" },
              { value: "normal", label: "Normal" },
              { value: "fast", label: "Fast" },
            ]}
            onPick={(v) => setSettings(SPEEDS[v])}
          />
          <Pills<WordPool>
            label="Word pool"
            value={s.wordPool}
            disabled={!isHost}
            options={[
              { value: "all", label: "Everything" },
              { value: "pokemon", label: "Pokémon" },
              { value: "characters", label: "Characters" },
              { value: "places", label: "Places" },
              { value: "terms", label: "Terms & Titles" },
            ]}
            onPick={(v) => setSettings({ wordPool: v })}
          />
          <Pills<Difficulty>
            label="Difficulty"
            value={s.difficulty}
            disabled={!isHost}
            options={[
              { value: "easy", label: "Relaxed" },
              { value: "adaptive", label: "Adaptive" },
              { value: "hard", label: "Brutal" },
            ]}
            onPick={(v) => setSettings({ difficulty: v })}
          />
        </div>
      </div>

      {isHost ? (
        <button
          onClick={() => sock.send({ type: "startGame" })}
          disabled={!canStart}
          className="btn-primary rounded-xl px-4 py-4 font-display text-xl"
        >
          {room.players.length < 2 ? "Need 2+ players" : "Start Game 💥"}
        </button>
      ) : (
        <div className="rounded-xl border border-line bg-panel/50 px-4 py-4 text-center font-display text-white/60">
          Waiting for the host to start…
        </div>
      )}

      {sock.lastError && (
        <p className="text-center text-xs text-neon-red">
          {sock.lastError.text}
        </p>
      )}
    </div>
  );
}
