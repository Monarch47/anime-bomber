# 💣 Anime Bomber

An anime-themed online word-bomb party game — like [jklm.fun](https://jklm.fun)'s
BombParty, but every valid word is a piece of anime: Pokémon, characters, anime
titles, places in Japan, and otaku terms.

Players join a room with a 4-letter code. A bomb passes around the circle showing
two letters — type any **anime word** that contains those letters before the
fuse runs out, or lose a heart. Last otaku standing wins.

## Stack

A minimal **T3 stack** plus a custom realtime layer:

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **tRPC v11** — room creation & lookups
- **Custom WebSocket server** (`ws`) — all realtime gameplay
- A custom Node server (`server.ts`, run with `tsx`) hosts Next.js **and** the
  WebSocket server in one process, so the tRPC routers and the game engine share
  one in-memory room store. No database — rooms are ephemeral.

## Run it locally

Requires **Node.js 18+**.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

To play with friends on the **same Wi-Fi**, the server prints a `Network:` URL
on startup (e.g. `http://192.168.1.20:3000`) — share that.

### Production build

```bash
npm run build
npm start
```

> On Windows, set the env var separately: `set NODE_ENV=production && npx tsx server.ts`.

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build of the Next.js app |
| `npm start` | Run the production server |
| `npm run typecheck` | `tsc --noEmit` |

## How to play

1. Enter a name and **Create a Room** (or join one with a code / shared link).
2. In the lobby the host tweaks settings — starting hearts, bomb speed, word
   pool (Everything / Pokémon / Characters / Places / Terms & Titles) and
   difficulty — then starts the game (needs 2+ players).
3. On your turn, the bomb shows **two letters**. Type any anime word that
   contains them — e.g. bomb `RA` → `na`**`ra`**`to`, `g`**`ra`**`veler`, `na`**`ra`**.
4. A correct word passes the bomb on; a timeout costs a heart.
5. Lose all hearts and you're out. Use enough different letters of the alphabet
   to earn a **bonus heart** ⭐.

The bomb only ever shows letter pairs that *have* a valid answer, and the
difficulty ramps as rounds go by.

## Playing over the internet

The game needs a persistent WebSocket connection, so it must run on a host that
supports long-lived Node processes — **not** Vercel's serverless functions.

- **Railway / Render / Fly.io** — deploy as a Node web service. Build command
  `npm run build`, start command `npm start`. Bind to `process.env.PORT`
  (already handled).
- **Quick tunnel** — run locally and expose it:
  `npx localtunnel --port 3000` or `cloudflared tunnel --url http://localhost:3000`.

WebSocket traffic uses the same origin as the page (`/ws`), so HTTPS hosts work
over `wss://` automatically.

## Project structure

```
server.ts                     Custom server: Next.js + ws on one port
src/
  app/
    layout.tsx, page.tsx       App Router entry (client game shell)
    globals.css                Tailwind v4 theme + animations
    api/trpc/[trpc]/route.ts   tRPC HTTP handler
  server/
    game/
      dictionary.ts            Anime word lists + syllable index
      protocol.ts              Shared client/server message types
      rooms.ts                 Room + RoomManager game engine
    ws/index.ts                WebSocket server wiring
    api/                       tRPC routers (room, stats)
  trpc/react.tsx               tRPC client provider
  hooks/useGameSocket.ts       Client WebSocket hook (reconnect, state)
  components/                  Home / Lobby / Game screens, Bomb, PlayerCard
  lib/                         Sounds (WebAudio) + session storage
```

## Customizing the dictionary

All words live in `src/server/game/dictionary.ts`, grouped into `POKEMON`,
`CHARACTERS`, `TITLES`, `PLACES` and `TERMS`. Add space-separated words to any
group and restart — words shorter than 3 letters are ignored, and the playable
syllables are recomputed automatically.
