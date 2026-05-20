/*
 * Custom Next.js server for Anime Bomber.
 *
 * Runs the Next.js app and a `ws` WebSocket server in a single process so the
 * tRPC routers and the realtime game engine share one in-memory RoomManager.
 *
 * - HTTP traffic            -> Next.js request handler
 * - WebSocket upgrade /ws   -> game WebSocket server
 * - other upgrades (HMR)    -> Next.js upgrade handler
 *
 * Started with `tsx` (see package.json scripts) so no build step is needed
 * for the server itself.
 */

import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import next from "next";
import { createGameWss } from "./src/server/ws/index";

const dev = process.env.NODE_ENV !== "production";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = "0.0.0.0";

async function main(): Promise<void> {
  const app = next({ dev, hostname, port });
  await app.prepare();

  const handle = app.getRequestHandler();
  const upgradeHandler = app.getUpgradeHandler();
  const wss = createGameWss();

  const server = createServer((req, res) => {
    void handle(req, res);
  });

  server.on("upgrade", (req, socket, head) => {
    let pathname = "/";
    try {
      pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    } catch {
      /* fall through */
    }
    if (pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      // Next.js HMR socket (dev) and anything else.
      void upgradeHandler(req, socket, head);
    }
  });

  server.listen(port, hostname, () => {
    printBanner(port);
  });
}

function printBanner(port: number): void {
  const lan: string[] = [];
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) lan.push(iface.address);
    }
  }
  console.log("\n  💣  Anime Bomber is live\n");
  console.log(`     Local:   http://localhost:${port}`);
  for (const ip of lan) {
    console.log(`     Network: http://${ip}:${port}`);
  }
  console.log("\n  Share a Network URL so friends on the same Wi-Fi can join.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
