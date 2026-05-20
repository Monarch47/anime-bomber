/*
 * Shared wire protocol between the browser client and the WebSocket server.
 *
 * This module is intentionally dependency-free (pure types + constants) so it
 * can be safely imported by both the Node server and the browser bundle.
 */

import type { WordPool } from "./dictionary";

export type { WordPool };

/** Letters required for the bonus-life reward. Q, X and Z are excluded. */
export const BONUS_LETTERS = "ABCDEFGHIJKLMNOPRSTUVWY".split("");
export const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const MAX_PLAYERS = 12;

export type Difficulty = "easy" | "adaptive" | "hard";
export type Phase = "lobby" | "playing" | "ended";

export interface RoomSettings {
  startLives: number;
  turnMin: number;
  turnMax: number;
  wordPool: WordPool;
  difficulty: Difficulty;
}

export interface PlayerView {
  id: string;
  name: string;
  lives: number;
  alive: boolean;
  connected: boolean;
  isHost: boolean;
  isCurrent: boolean;
  lettersUsed: string[];
  typed: string;
}

export interface GameView {
  syllable: string;
  currentId: string;
  turnEndsAt: number;
  turnDuration: number;
  turnCount: number;
  usedWords: number;
}

export interface RoomSnapshot {
  code: string;
  phase: Phase;
  hostId: string | null;
  settings: RoomSettings;
  players: PlayerView[];
  game: GameView | null;
  winnerId: string | null;
  bonusLetters: string[];
}

/* ---------- Client -> Server ---------- */

export type ClientMessage =
  | { type: "joinRoom"; code: string; name: string; playerId?: string }
  | { type: "leaveRoom" }
  | { type: "setSettings"; settings: Partial<RoomSettings> }
  | { type: "startGame" }
  | { type: "submit"; word: string }
  | { type: "typing"; text: string }
  | { type: "backToLobby" };

/* ---------- Server -> Client ---------- */

export type GameEvent =
  | { kind: "start" }
  | { kind: "correct"; playerId: string; name: string; word: string }
  | { kind: "explode"; playerId: string; name: string; eliminated: boolean }
  | { kind: "bonus"; playerId: string; name: string }
  | { kind: "gameover"; winnerId: string | null; name: string | null };

export type ServerMessage =
  | { type: "joined"; code: string; you: { id: string; name: string } }
  | { type: "state"; room: RoomSnapshot }
  | { type: "event"; event: GameEvent }
  | { type: "reject"; reason: string }
  | { type: "typing"; playerId: string; text: string }
  | { type: "errorMsg"; text: string };

/** Every server->client payload also carries the server clock for timer sync. */
export type ServerEnvelope = ServerMessage & { serverNow: number };

export const DEFAULT_SETTINGS: RoomSettings = {
  startLives: 2,
  turnMin: 7,
  turnMax: 13,
  wordPool: "all",
  difficulty: "adaptive",
};
