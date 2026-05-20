/*
 * WebSocket layer. Creates a `ws` server (in noServer mode — the custom HTTP
 * server in server.ts routes upgrade requests to it) and hands every new
 * connection to the shared RoomManager.
 */

import { WebSocketServer, type WebSocket } from "ws";
import { getRoomManager } from "../game/rooms";

export function createGameWss(): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  const manager = getRoomManager();

  wss.on("connection", (ws: WebSocket) => {
    manager.attach(ws);
  });

  // Heartbeat — terminate sockets that stop answering pings.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const w = ws as WebSocket & { isAlive?: boolean };
      if (w.isAlive === false) {
        w.terminate();
        continue;
      }
      w.isAlive = false;
      try {
        w.ping();
      } catch {
        /* ignore */
      }
    }
  }, 30_000);
  heartbeat.unref();

  // Drop stale, empty rooms once a minute.
  const sweeper = setInterval(() => manager.sweep(), 60_000);
  sweeper.unref();

  wss.on("close", () => {
    clearInterval(heartbeat);
    clearInterval(sweeper);
  });

  return wss;
}
