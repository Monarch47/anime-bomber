"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameSocket } from "@/hooks/useGameSocket";
import { sound } from "@/lib/sounds";
import Bomb from "./Bomb";
import PlayerCard from "./PlayerCard";

interface Toast {
  id: number;
  text: string;
  tone: "good" | "bad" | "gold" | "info";
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const TONE: Record<Toast["tone"], string> = {
  good: "border-neon-mint text-neon-mint",
  bad: "border-neon-red text-neon-red",
  gold: "border-neon-gold text-neon-gold",
  info: "border-neon-cyan text-neon-cyan",
};

export default function GameScreen({ sock }: { sock: GameSocket }) {
  const room = sock.room!;
  const game = room.game;
  const youId = sock.youId;
  const you = room.players.find((p) => p.id === youId) ?? null;

  const [input, setInput] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [boom, setBoom] = useState(false);
  const [muted, setMuted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const toastId = useRef(0);
  const lastTyping = useRef(0);

  const isYourTurn =
    room.phase === "playing" && !!game && game.currentId === youId;
  const currentPlayer = game
    ? (room.players.find((p) => p.id === game.currentId) ?? null)
    : null;
  const turnCount = game?.turnCount ?? 0;

  // React to game events: toasts + sound.
  useEffect(() => {
    const ev = sock.lastEvent;
    if (!ev) return;
    const e = ev.event;
    const add = (text: string, tone: Toast["tone"]) => {
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-3), { id, text, tone }]);
      setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== id)),
        2600,
      );
    };
    if (e.kind === "correct") {
      add(`✅ ${e.name}: ${e.word.toUpperCase()}`, "good");
      sound.correct();
    } else if (e.kind === "explode") {
      add(`💥 ${e.name} got bombed!${e.eliminated ? "  ☠️ OUT!" : ""}`, "bad");
      sound.explode();
      setBoom(true);
      setTimeout(() => setBoom(false), 680);
    } else if (e.kind === "bonus") {
      add(`⭐ ${e.name} earned a heart!`, "gold");
      sound.bonus();
    } else if (e.kind === "start") {
      add("🔥 Game on!", "info");
    } else if (e.kind === "gameover") {
      sound.win();
    }
  }, [sock.lastEvent]);

  // React to rejected words.
  useEffect(() => {
    const r = sock.lastReject;
    if (!r) return;
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, text: `❌ ${r.reason}`, tone: "bad" }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    const el = inputRef.current;
    if (el) {
      el.classList.remove("anim-shake");
      void el.offsetWidth;
      el.classList.add("anim-shake");
    }
  }, [sock.lastReject]);

  // On every new turn: clear the box, focus + chime if it's yours.
  useEffect(() => {
    setInput("");
    if (isYourTurn) {
      sound.turn();
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnCount]);

  useEffect(() => {
    sound.setMuted(muted);
  }, [muted]);

  const handleInput = (v: string) => {
    setInput(v);
    if (isYourTurn) {
      const now = Date.now();
      if (now - lastTyping.current > 70) {
        lastTyping.current = now;
        sock.send({ type: "typing", text: v });
      }
    }
  };

  const handleSubmit = () => {
    if (!isYourTurn) return;
    const w = input.trim();
    if (w.length < 1) return;
    sock.send({ type: "submit", word: w });
  };

  const currentTyped = useMemo(() => {
    if (!game) return "";
    if (game.currentId === youId) return input;
    if (sock.typing && sock.typing.playerId === game.currentId) {
      return sock.typing.text;
    }
    return currentPlayer?.typed ?? "";
  }, [game, youId, input, sock.typing, currentPlayer]);

  const usedLetters = new Set(you?.lettersUsed ?? []);
  const requiredLetters = new Set(room.bonusLetters);
  const winner = room.winnerId
    ? (room.players.find((p) => p.id === room.winnerId) ?? null)
    : null;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-4">
      {/* top bar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={sock.leaveRoom}
            className="rounded-lg border border-line px-3 py-1.5 text-white/70 hover:border-neon-red hover:text-neon-red"
          >
            Leave
          </button>
          <span className="font-display text-white/45">Room {room.code}</span>
        </div>
        {game && (
          <div className="flex items-center gap-2 text-white/45">
            <span>Round {game.turnCount}</span>
            <span>·</span>
            <span>{game.usedWords} words used</span>
          </div>
        )}
        <button
          onClick={() => setMuted((m) => !m)}
          className="rounded-lg border border-line px-3 py-1.5"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* players */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {room.players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            isYou={p.id === youId}
            typedText={p.isCurrent ? currentTyped : undefined}
          />
        ))}
      </div>

      {/* bomb + input */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
        {game ? (
          <>
            <Bomb
              syllable={game.syllable}
              turnEndsAt={game.turnEndsAt}
              turnDuration={game.turnDuration}
              serverNow={sock.serverNow}
              shaking={boom}
            />
            <p className="text-center text-sm text-white/55">
              {isYourTurn
                ? "YOUR TURN — "
                : `${currentPlayer?.name ?? "…"} is up — `}
              type an anime word with{" "}
              <span className="font-display text-neon-gold">
                {game.syllable}
              </span>
            </p>
          </>
        ) : (
          <div className="font-display text-2xl text-white/40">
            Game over
          </div>
        )}

        <div className="w-full max-w-md">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            disabled={!isYourTurn}
            placeholder={
              isYourTurn
                ? `Anime word with ${game?.syllable ?? ""}…`
                : `Waiting for ${currentPlayer?.name ?? "…"}`
            }
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={[
              "w-full rounded-xl border-2 bg-ink-soft px-4 py-3 text-center font-display text-2xl uppercase tracking-wide outline-none transition",
              isYourTurn
                ? "border-neon-cyan text-white"
                : "border-line text-white/40",
            ].join(" ")}
          />
        </div>

        {you && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex flex-wrap justify-center gap-1">
              {ALPHABET.map((L) => {
                const used = usedLetters.has(L);
                const required = requiredLetters.has(L);
                return (
                  <span
                    key={L}
                    className={[
                      "grid h-6 w-6 place-items-center rounded text-xs font-bold",
                      used
                        ? "bg-neon-mint text-ink"
                        : required
                          ? "bg-panel-soft text-white/45"
                          : "bg-panel/40 text-white/20",
                    ].join(" ")}
                  >
                    {L}
                  </span>
                );
              })}
            </div>
            <p className="text-[11px] text-white/40">
              Use every letter for a bonus heart ·{" "}
              {[...usedLetters].filter((l) => requiredLetters.has(l)).length}/
              {room.bonusLetters.length}
            </p>
          </div>
        )}
      </div>

      {/* toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`anim-toast rounded-full border bg-ink/95 px-4 py-2 text-sm font-bold ${TONE[t.tone]}`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* game over */}
      {room.phase === "ended" && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-ink/80 p-4 backdrop-blur">
          <div className="anim-pop w-[min(92vw,26rem)] rounded-3xl border border-line bg-panel p-7 text-center">
            <div className="text-5xl">
              {winner && winner.id === youId ? "🏆" : "🎌"}
            </div>
            <h2 className="mt-2 font-display text-3xl text-neon-gold glow-text">
              {winner
                ? winner.id === youId
                  ? "You win!"
                  : `${winner.name} wins!`
                : "Draw!"}
            </h2>
            <div className="mt-4 space-y-1 text-sm text-white/70">
              {room.players.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between rounded-lg bg-ink-soft px-3 py-1.5"
                >
                  <span>
                    {p.name}
                    {p.id === youId ? " (you)" : ""}
                  </span>
                  <span>{p.lives > 0 ? "❤️".repeat(p.lives) : "💀"}</span>
                </div>
              ))}
            </div>
            {room.hostId === youId ? (
              <button
                onClick={() => sock.send({ type: "backToLobby" })}
                className="btn-primary mt-5 w-full rounded-xl px-4 py-3 font-display"
              >
                Back to Lobby
              </button>
            ) : (
              <p className="mt-5 text-sm text-white/50">
                Waiting for the host…
              </p>
            )}
            <button
              onClick={sock.leaveRoom}
              className="mt-2 w-full rounded-xl border border-line px-4 py-2 text-sm text-white/60 hover:text-white"
            >
              Leave game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
