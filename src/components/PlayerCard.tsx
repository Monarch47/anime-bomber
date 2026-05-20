import type { PlayerView } from "@/server/game/protocol";

export default function PlayerCard({
  player,
  isYou,
  typedText,
}: {
  player: PlayerView;
  isYou: boolean;
  typedText?: string;
}) {
  const dead = !player.alive;
  const hearts = Array.from({ length: Math.max(0, player.lives) });

  return (
    <div
      className={[
        "relative flex w-32 flex-col items-center gap-1 rounded-2xl border px-3 py-3 transition",
        player.isCurrent
          ? "border-neon-cyan bg-neon-cyan/10 shadow-[0_0_30px_-4px_var(--color-neon-cyan)]"
          : "border-line bg-panel/70",
        dead ? "opacity-45 grayscale" : "",
      ].join(" ")}
    >
      {player.isHost && (
        <div className="absolute -left-2 -top-2 text-lg" title="Host">
          👑
        </div>
      )}
      {!player.connected && (
        <div
          className="absolute -right-2 -top-2 text-sm"
          title="Disconnected"
        >
          📴
        </div>
      )}

      <span className="max-w-[7rem] truncate font-display text-sm">
        {player.name}
      </span>

      <div className="flex min-h-[1.1rem] flex-wrap justify-center gap-0.5 text-sm leading-none">
        {dead ? (
          <span title="Eliminated">💀</span>
        ) : (
          hearts.map((_, i) => <span key={i}>❤️</span>)
        )}
      </div>

      {isYou && (
        <span className="rounded-full bg-neon-pink px-2 py-0.5 text-[10px] font-bold tracking-wider text-white">
          YOU
        </span>
      )}

      {player.isCurrent && typedText !== undefined && (
        <div className="mt-0.5 min-h-[1rem] max-w-[7rem] truncate text-xs font-bold text-neon-cyan">
          {typedText ? typedText.toUpperCase() : "…"}
        </div>
      )}
    </div>
  );
}
