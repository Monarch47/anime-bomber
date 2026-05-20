"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { loadName } from "@/lib/session";
import { sound } from "@/lib/sounds";
import type { GameSocket } from "@/hooks/useGameSocket";

export default function HomeScreen({ sock }: { sock: GameSocket }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const stats = api.stats.dictionary.useQuery();
  const createRoom = api.room.create.useMutation();

  useEffect(() => {
    setName(loadName() ?? "");
    const params = new URLSearchParams(window.location.search);
    const r = params.get("room");
    if (r) setCode(r.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4));
  }, []);

  useEffect(() => {
    if (sock.lastError) setBusy(false);
  }, [sock.lastError]);

  const nameOk = name.trim().length > 0;
  const online = sock.connection === "open";

  const handleCreate = async () => {
    if (!nameOk || busy || !online) return;
    setBusy(true);
    sound.unlock();
    try {
      const res = await createRoom.mutateAsync();
      sock.joinRoom(res.code, name);
    } catch {
      setBusy(false);
    }
  };

  const handleJoin = () => {
    if (!nameOk || code.trim().length < 4 || busy || !online) return;
    setBusy(true);
    sound.unlock();
    sock.joinRoom(code, name);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <h1 className="font-display text-6xl leading-none">
          <span className="text-neon-pink glow-text">ANIME</span>
          <br />
          <span className="text-neon-cyan glow-text">BOMBER</span>{" "}
          <span className="inline-block anim-float">💣</span>
        </h1>
        <p className="mt-3 text-sm text-white/70">
          Type an anime word containing the bomb&apos;s letters — before it
          blows. Pokémon, characters, places in Japan &amp; more.
        </p>
      </div>

      <div className="w-full rounded-3xl border border-line bg-panel/80 p-5 shadow-2xl backdrop-blur">
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-white/60">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 16))}
          placeholder="Senpai"
          maxLength={16}
          className="mb-4 w-full rounded-xl border border-line bg-ink-soft px-4 py-3 text-lg outline-none focus:border-neon-pink"
        />

        <button
          onClick={handleCreate}
          disabled={!nameOk || busy || !online}
          className="btn-primary w-full rounded-xl px-4 py-3 font-display text-lg"
        >
          {busy ? "Loading…" : "Create a Room"}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-white/40">
          <div className="h-px flex-1 bg-line" />
          OR JOIN ONE
          <div className="h-px flex-1 bg-line" />
        </div>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, "")
                  .slice(0, 4),
              )
            }
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="CODE"
            className="w-32 rounded-xl border border-line bg-ink-soft px-4 py-3 text-center font-display text-xl tracking-[0.3em] outline-none focus:border-neon-cyan"
          />
          <button
            onClick={handleJoin}
            disabled={!nameOk || code.length < 4 || busy || !online}
            className="flex-1 rounded-xl border border-neon-cyan bg-neon-cyan/10 px-4 py-3 font-display text-lg text-neon-cyan transition hover:bg-neon-cyan/20 disabled:opacity-40"
          >
            Join
          </button>
        </div>

        {!online && (
          <p className="mt-3 text-center text-xs text-neon-gold">
            Connecting to server…
          </p>
        )}
        {sock.lastError && online && (
          <p className="mt-3 text-center text-xs text-neon-red">
            {sock.lastError.text}
          </p>
        )}
      </div>

      <p className="text-center text-xs text-white/45">
        {stats.data
          ? `${stats.data.total} anime words loaded · ${stats.data.categories.pokemon} Pokémon · ${stats.data.categories.characters} characters`
          : "Loading the anime dictionary…"}
      </p>

      <details className="w-full rounded-2xl border border-line bg-panel/50 p-4 text-sm text-white/75">
        <summary className="cursor-pointer font-display text-white">
          How to play
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/65">
          <li>Players take turns holding the bomb.</li>
          <li>
            The bomb shows two letters — type any anime word that{" "}
            <em>contains</em> them (e.g. <b>RA</b> → na<b>ra</b>to).
          </li>
          <li>Answer before the timer hits zero or you lose a heart.</li>
          <li>Run out of hearts and you&apos;re out. Last player standing wins.</li>
          <li>Use enough different letters to earn a bonus heart. ⭐</li>
        </ul>
      </details>
    </div>
  );
}
