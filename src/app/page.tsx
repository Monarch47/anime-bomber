"use client";

import { useGameSocket } from "@/hooks/useGameSocket";
import HomeScreen from "@/components/HomeScreen";
import LobbyScreen from "@/components/LobbyScreen";
import GameScreen from "@/components/GameScreen";

export default function Page() {
  const sock = useGameSocket();
  const { room } = sock;

  return (
    <>
      {sock.connection === "closed" && (
        <div className="fixed inset-x-0 top-0 z-50 bg-neon-red/90 py-1 text-center text-xs font-bold text-white">
          Connection lost — reconnecting…
        </div>
      )}

      {!room && <HomeScreen sock={sock} />}
      {room && room.phase === "lobby" && <LobbyScreen sock={sock} />}
      {room && room.phase !== "lobby" && <GameScreen sock={sock} />}
    </>
  );
}
