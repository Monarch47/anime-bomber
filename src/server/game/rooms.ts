/*
 * Anime Bomber — room & game-state engine.
 *
 * A single RoomManager singleton holds every active room. It is shared between
 * the WebSocket layer and the tRPC routers via a globalThis cache (the same
 * pattern T3 uses for the Prisma client) so both run inside one process.
 */

import { WebSocket } from "ws";
import {
  buildSyllableIndex,
  displayOf,
  has,
  normalize,
  wordListForPool,
} from "./dictionary";
import {
  BONUS_LETTERS,
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  type ClientMessage,
  type Difficulty,
  type GameEvent,
  type RoomSettings,
  type RoomSnapshot,
  type ServerMessage,
  type WordPool,
} from "./protocol";

const BONUS_SET = new Set(BONUS_LETTERS);
const WORD_POOLS: WordPool[] = ["all", "pokemon", "characters", "places", "terms"];
const DIFFICULTIES: Difficulty[] = ["easy", "adaptive", "hard"];

interface Player {
  id: string;
  name: string;
  ws: WebSocket | null;
  lives: number;
  connected: boolean;
  lettersUsed: Set<string>;
  typed: string;
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function send(ws: WebSocket | null, msg: ServerMessage): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ ...msg, serverNow: Date.now() }));
    } catch {
      /* ignore broken sockets */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Room                                                                */
/* ------------------------------------------------------------------ */

export class Room {
  code: string;
  players: Player[] = [];
  hostId: string | null = null;
  phase: "lobby" | "playing" | "ended" = "lobby";
  settings: RoomSettings = { ...DEFAULT_SETTINGS };
  winnerId: string | null = null;
  emptySince: number | null = Date.now();

  // game state
  private wordList: string[] = [];
  private syllableIndex = new Map<string, string[]>();
  private usedWords = new Set<string>();
  private syllable = "";
  private lastSyllable = "";
  private currentId: string | null = null;
  private turnCount = 0;
  private turnDuration = 0;
  private turnEndsAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(code: string) {
    this.code = code;
  }

  /* ---------- helpers ---------- */

  getPlayer(id: string | null): Player | undefined {
    if (!id) return undefined;
    return this.players.find((p) => p.id === id);
  }

  connectedCount(): number {
    return this.players.filter((p) => p.connected).length;
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /* ---------- networking ---------- */

  snapshot(): RoomSnapshot {
    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      settings: this.settings,
      winnerId: this.winnerId,
      bonusLetters: BONUS_LETTERS,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        lives: p.lives,
        alive: this.phase === "lobby" ? true : p.lives > 0,
        connected: p.connected,
        isHost: p.id === this.hostId,
        isCurrent: this.phase === "playing" && p.id === this.currentId,
        lettersUsed: [...p.lettersUsed],
        typed: p.typed,
      })),
      game:
        this.phase === "playing"
          ? {
              syllable: this.syllable,
              currentId: this.currentId ?? "",
              turnEndsAt: this.turnEndsAt,
              turnDuration: this.turnDuration,
              turnCount: this.turnCount,
              usedWords: this.usedWords.size,
            }
          : null,
    };
  }

  broadcast(msg: ServerMessage): void {
    for (const p of this.players) send(p.ws, msg);
  }

  broadcastState(): void {
    this.broadcast({ type: "state", room: this.snapshot() });
  }

  private broadcastEvent(event: GameEvent): void {
    this.broadcast({ type: "event", event });
  }

  /* ---------- membership ---------- */

  addPlayer(ws: WebSocket, name: string): Player {
    const player: Player = {
      id: randomId(),
      name,
      ws,
      lives: this.settings.startLives,
      connected: true,
      lettersUsed: new Set(),
      typed: "",
    };
    this.players.push(player);
    if (!this.hostId) this.hostId = player.id;
    this.emptySince = null;
    return player;
  }

  removePlayer(id: string): void {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const wasCurrent = this.phase === "playing" && this.currentId === id;

    if (wasCurrent) {
      const nextId = this.nextAliveAfter(id);
      this.players.splice(idx, 1);
      this.clearTimer();
      if (!nextId || nextId === id) {
        this.finish();
      } else {
        this.beginTurn(nextId);
      }
    } else {
      this.players.splice(idx, 1);
    }

    if (this.hostId === id) {
      this.hostId = this.players[0]?.id ?? null;
    }

    if (this.phase === "playing" && !wasCurrent) {
      const alive = this.players.filter((p) => p.lives > 0);
      if (alive.length <= 1) this.finish();
    }

    if (this.players.length === 0) {
      this.clearTimer();
      this.emptySince = Date.now();
    }
    this.broadcastState();
  }

  /* ---------- settings ---------- */

  updateSettings(partial: Partial<RoomSettings>): void {
    if (this.phase !== "lobby") return;
    const s = { ...this.settings };
    if (partial.startLives != null) {
      s.startLives = clamp(Math.round(partial.startLives), 1, 5);
    }
    if (partial.turnMin != null) {
      s.turnMin = clamp(Math.round(partial.turnMin), 3, 20);
    }
    if (partial.turnMax != null) {
      s.turnMax = clamp(Math.round(partial.turnMax), 4, 30);
    }
    if (s.turnMax < s.turnMin) s.turnMax = s.turnMin + 2;
    if (partial.wordPool && WORD_POOLS.includes(partial.wordPool)) {
      s.wordPool = partial.wordPool;
    }
    if (partial.difficulty && DIFFICULTIES.includes(partial.difficulty)) {
      s.difficulty = partial.difficulty;
    }
    this.settings = s;
    for (const p of this.players) p.lives = s.startLives;
    this.broadcastState();
  }

  /* ---------- game lifecycle ---------- */

  startGame(byPlayerId: string): void {
    if (this.phase !== "lobby") return;
    const host = this.getPlayer(byPlayerId);
    if (!host || byPlayerId !== this.hostId) return;
    if (this.players.length < 2) {
      send(host.ws, {
        type: "errorMsg",
        text: "Need at least 2 players to start.",
      });
      return;
    }

    this.wordList = wordListForPool(this.settings.wordPool);
    this.syllableIndex = buildSyllableIndex(this.wordList);
    this.usedWords = new Set();
    this.turnCount = 0;
    this.lastSyllable = "";
    this.winnerId = null;
    this.phase = "playing";
    for (const p of this.players) {
      p.lives = this.settings.startLives;
      p.lettersUsed = new Set();
      p.typed = "";
    }

    const starter = this.players[Math.floor(Math.random() * this.players.length)]!;
    this.broadcastEvent({ kind: "start" });
    this.beginTurn(starter.id);
    this.broadcastState();
  }

  resetToLobby(byPlayerId: string): void {
    if (this.phase !== "ended") return;
    if (byPlayerId !== this.hostId) return;
    this.clearTimer();
    this.phase = "lobby";
    this.winnerId = null;
    this.currentId = null;
    this.syllable = "";
    this.usedWords = new Set();
    for (const p of this.players) {
      p.lives = this.settings.startLives;
      p.lettersUsed = new Set();
      p.typed = "";
    }
    this.broadcastState();
  }

  private finish(): void {
    this.clearTimer();
    this.phase = "ended";
    const alive = this.players.filter((p) => p.lives > 0);
    const winner = alive.length === 1 ? alive[0]! : null;
    this.winnerId = winner?.id ?? null;
    this.currentId = null;
    this.broadcastEvent({
      kind: "gameover",
      winnerId: this.winnerId,
      name: winner?.name ?? null,
    });
  }

  /* ---------- turns ---------- */

  private computeTurnMs(): number {
    const s = this.settings;
    let base = s.turnMin + Math.random() * (s.turnMax - s.turnMin);
    const diffMult =
      s.difficulty === "easy" ? 1.25 : s.difficulty === "hard" ? 0.8 : 1;
    base *= diffMult;
    const speedup = Math.min(base - 3, this.turnCount * 0.12);
    const secs = Math.max(3.2, base - speedup);
    return Math.round(secs * 1000);
  }

  private pickSyllable(): string {
    type Cand = { syl: string; n: number };
    const collect = (minTotal: number): Cand[] => {
      const out: Cand[] = [];
      for (const [syl, words] of this.syllableIndex) {
        if (words.length < minTotal) continue;
        let unused = 0;
        for (const w of words) if (!this.usedWords.has(w)) unused++;
        if (unused > 0) out.push({ syl, n: unused });
      }
      return out;
    };

    let candidates = collect(3);
    if (candidates.length === 0) candidates = collect(1);
    if (candidates.length === 0) {
      // Everything has been used — recycle the word pool.
      this.usedWords = new Set();
      candidates = collect(3);
    }
    if (candidates.length === 0) return "AN";

    candidates.sort((a, b) => b.n - a.n);
    const L = candidates.length;
    const diff = this.settings.difficulty;
    let lo = 0;
    let hi = L;

    if (diff === "easy") {
      hi = Math.max(1, Math.ceil(L * 0.45));
    } else if (diff === "hard") {
      lo = Math.floor(L * 0.45);
    } else {
      const prog = Math.min(1, this.turnCount / 45);
      hi = Math.max(1, Math.ceil(L * (0.35 + 0.65 * prog)));
      lo = Math.floor(L * 0.25 * prog);
    }
    lo = clamp(lo, 0, L - 1);
    if (lo >= hi) hi = lo + 1;

    let band = candidates.slice(lo, hi);
    let total = 0;
    for (const c of band) total += Math.sqrt(c.n);
    let r = Math.random() * total;
    let chosen = band[band.length - 1]!;
    for (const c of band) {
      r -= Math.sqrt(c.n);
      if (r <= 0) {
        chosen = c;
        break;
      }
    }
    if (chosen.syl === this.lastSyllable && band.length > 1) {
      const alt = band.filter((c) => c.syl !== this.lastSyllable);
      chosen = alt[Math.floor(Math.random() * alt.length)]!;
    }
    this.lastSyllable = chosen.syl;
    return chosen.syl;
  }

  private nextAliveAfter(id: string): string | null {
    const n = this.players.length;
    if (n === 0) return null;
    const idx = this.players.findIndex((p) => p.id === id);
    const start = idx < 0 ? 0 : idx;
    for (let step = 1; step <= n; step++) {
      const p = this.players[(start + step) % n]!;
      if (p.lives > 0) return p.id;
    }
    return null;
  }

  private beginTurn(playerId: string): void {
    this.clearTimer();
    this.currentId = playerId;
    this.turnCount += 1;
    this.syllable = this.pickSyllable();
    let duration = this.computeTurnMs();
    const player = this.getPlayer(playerId);
    if (player && !player.connected) {
      duration = Math.min(duration, 3500);
    }
    this.turnDuration = duration;
    this.turnEndsAt = Date.now() + duration;
    for (const p of this.players) p.typed = "";
    this.timer = setTimeout(() => this.onExpire(), duration);
  }

  private advanceOrEnd(): void {
    const alive = this.players.filter((p) => p.lives > 0);
    if (alive.length <= 1) {
      this.finish();
      this.broadcastState();
      return;
    }
    const next = this.nextAliveAfter(this.currentId ?? alive[0]!.id);
    if (!next) {
      this.finish();
    } else {
      this.beginTurn(next);
    }
    this.broadcastState();
  }

  private onExpire(): void {
    if (this.phase !== "playing") return;
    this.timer = null;
    const p = this.getPlayer(this.currentId);
    if (p) {
      p.lives = Math.max(0, p.lives - 1);
      this.broadcastEvent({
        kind: "explode",
        playerId: p.id,
        name: p.name,
        eliminated: p.lives === 0,
      });
    }
    this.advanceOrEnd();
  }

  /* ---------- player actions ---------- */

  submitWord(playerId: string, raw: string): void {
    if (this.phase !== "playing") return;
    const p = this.getPlayer(playerId);
    if (!p) return;
    if (playerId !== this.currentId) {
      send(p.ws, { type: "reject", reason: "It's not your turn." });
      return;
    }
    const word = normalize(raw);
    if (word.length < 3) {
      send(p.ws, { type: "reject", reason: "Too short." });
      return;
    }
    if (!word.includes(this.syllable)) {
      send(p.ws, {
        type: "reject",
        reason: `Must contain "${this.syllable}".`,
      });
      return;
    }
    if (!has(word)) {
      send(p.ws, { type: "reject", reason: "Not in the anime dictionary!" });
      return;
    }
    if (this.usedWords.has(word)) {
      send(p.ws, { type: "reject", reason: "Already used this game!" });
      return;
    }

    // Accepted.
    this.usedWords.add(word);
    for (const ch of word) {
      if (BONUS_SET.has(ch)) p.lettersUsed.add(ch);
    }
    this.broadcastEvent({
      kind: "correct",
      playerId,
      name: p.name,
      word: displayOf(word),
    });
    if (p.lettersUsed.size >= BONUS_LETTERS.length) {
      p.lives += 1;
      p.lettersUsed = new Set();
      this.broadcastEvent({ kind: "bonus", playerId, name: p.name });
    }

    this.clearTimer();
    this.advanceOrEnd();
  }

  handleTyping(playerId: string, text: string): void {
    if (this.phase !== "playing" || playerId !== this.currentId) return;
    const p = this.getPlayer(playerId);
    if (!p) return;
    p.typed = String(text ?? "").slice(0, 40);
    this.broadcast({ type: "typing", playerId, text: p.typed });
  }
}

/* ------------------------------------------------------------------ */
/* RoomManager                                                         */
/* ------------------------------------------------------------------ */

interface ConnMeta {
  code: string;
  playerId: string;
}

function sanitizeName(name: unknown): string {
  return (
    String(name ?? "")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, 16) || "Player"
  );
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private meta = new WeakMap<WebSocket, ConnMeta>();

  createRoom(): string {
    let code = randomCode();
    while (this.rooms.has(code)) code = randomCode();
    this.rooms.set(code, new Room(code));
    return code;
  }

  roomExists(code: string): boolean {
    return this.rooms.has(code);
  }

  /** Wire up lifecycle handlers for a freshly connected socket. */
  attach(ws: WebSocket): void {
    type Pinged = WebSocket & { isAlive?: boolean };
    (ws as Pinged).isAlive = true;
    ws.on("pong", () => {
      (ws as Pinged).isAlive = true;
    });
    ws.on("message", (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        return;
      }
      this.handleMessage(ws, msg);
    });
    ws.on("close", () => this.handleClose(ws));
    ws.on("error", () => {});
  }

  private handleMessage(ws: WebSocket, msg: ClientMessage): void {
    if (!msg || typeof msg.type !== "string") return;

    if (msg.type === "joinRoom") {
      this.handleJoin(ws, msg);
      return;
    }

    const meta = this.meta.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.code);
    if (!room) return;
    const playerId = meta.playerId;

    switch (msg.type) {
      case "leaveRoom": {
        room.removePlayer(playerId);
        this.meta.delete(ws);
        if (room.players.length === 0) this.rooms.delete(room.code);
        break;
      }
      case "setSettings": {
        if (playerId === room.hostId) room.updateSettings(msg.settings ?? {});
        break;
      }
      case "startGame": {
        room.startGame(playerId);
        break;
      }
      case "submit": {
        room.submitWord(playerId, msg.word ?? "");
        break;
      }
      case "typing": {
        room.handleTyping(playerId, msg.text ?? "");
        break;
      }
      case "backToLobby": {
        room.resetToLobby(playerId);
        break;
      }
    }
  }

  private handleJoin(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: "joinRoom" }>,
  ): void {
    const code = String(msg.code ?? "").toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      send(ws, { type: "errorMsg", text: "Room not found." });
      return;
    }

    const name = sanitizeName(msg.name);

    // Reconnect to an existing seat.
    if (msg.playerId) {
      const existing = room.getPlayer(msg.playerId);
      if (existing) {
        existing.ws = ws;
        existing.connected = true;
        room.emptySince = null;
        this.meta.set(ws, { code, playerId: existing.id });
        send(ws, {
          type: "joined",
          code,
          you: { id: existing.id, name: existing.name },
        });
        room.broadcastState();
        return;
      }
    }

    if (room.phase !== "lobby") {
      send(ws, { type: "errorMsg", text: "That game is already in progress." });
      return;
    }
    if (room.players.length >= MAX_PLAYERS) {
      send(ws, { type: "errorMsg", text: "That room is full." });
      return;
    }

    const player = room.addPlayer(ws, name);
    this.meta.set(ws, { code, playerId: player.id });
    send(ws, {
      type: "joined",
      code,
      you: { id: player.id, name: player.name },
    });
    room.broadcastState();
  }

  private handleClose(ws: WebSocket): void {
    const meta = this.meta.get(ws);
    if (!meta) return;
    this.meta.delete(ws);
    const room = this.rooms.get(meta.code);
    if (!room) return;
    const player = room.getPlayer(meta.playerId);
    if (!player) return;

    if (room.phase === "lobby") {
      room.removePlayer(player.id);
    } else {
      // Keep the seat during a game so the player can reconnect.
      player.connected = false;
      player.ws = null;
      if (room.connectedCount() === 0) room.emptySince = Date.now();
      room.broadcastState();
    }
    if (room.players.length === 0) this.rooms.delete(room.code);
  }

  /** Periodically drop rooms that have been empty for too long. */
  sweep(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.connectedCount() > 0) {
        room.emptySince = null;
        continue;
      }
      if (room.emptySince == null) {
        room.emptySince = now;
      } else if (now - room.emptySince > 10 * 60 * 1000) {
        this.rooms.delete(code);
      }
    }
  }
}

/* Shared singleton across the WS layer and the tRPC routers. */
const globalForRooms = globalThis as unknown as {
  __animeBomberRooms?: RoomManager;
};

export function getRoomManager(): RoomManager {
  if (!globalForRooms.__animeBomberRooms) {
    globalForRooms.__animeBomberRooms = new RoomManager();
  }
  return globalForRooms.__animeBomberRooms;
}
