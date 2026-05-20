"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientMessage,
  GameEvent,
  RoomSnapshot,
  ServerEnvelope,
} from "@/server/game/protocol";
import {
  clearSession,
  loadSession,
  saveName,
  saveSession,
  type Session,
} from "@/lib/session";

export type Connection = "connecting" | "open" | "closed";

export interface GameSocket {
  connection: Connection;
  room: RoomSnapshot | null;
  youId: string | null;
  lastEvent: { seq: number; event: GameEvent } | null;
  lastReject: { seq: number; reason: string } | null;
  lastError: { seq: number; text: string } | null;
  typing: { seq: number; playerId: string; text: string } | null;
  serverNow: () => number;
  joinRoom: (code: string, name: string) => void;
  leaveRoom: () => void;
  send: (msg: ClientMessage) => void;
}

export function useGameSocket(): GameSocket {
  const [connection, setConnection] = useState<Connection>("connecting");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [youId, setYouId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] =
    useState<GameSocket["lastEvent"]>(null);
  const [lastReject, setLastReject] =
    useState<GameSocket["lastReject"]>(null);
  const [lastError, setLastError] =
    useState<GameSocket["lastError"]>(null);
  const [typing, setTyping] = useState<GameSocket["typing"]>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const offsetRef = useRef(0);
  const seqRef = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  const queueRef = useRef<ClientMessage[]>([]);
  const roomRef = useRef<RoomSnapshot | null>(null);
  roomRef.current = room;

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      queueRef.current.push(msg);
    }
  }, []);

  const handle = useCallback((data: ServerEnvelope) => {
    offsetRef.current = data.serverNow - Date.now();
    switch (data.type) {
      case "joined": {
        setYouId(data.you.id);
        const s: Session = {
          code: data.code,
          playerId: data.you.id,
          name: data.you.name,
        };
        sessionRef.current = s;
        saveSession(s);
        break;
      }
      case "state":
        setRoom(data.room);
        break;
      case "event":
        setLastEvent({ seq: ++seqRef.current, event: data.event });
        break;
      case "reject":
        setLastReject({ seq: ++seqRef.current, reason: data.reason });
        break;
      case "typing":
        setTyping({
          seq: ++seqRef.current,
          playerId: data.playerId,
          text: data.text,
        });
        break;
      case "errorMsg": {
        setLastError({ seq: ++seqRef.current, text: data.text });
        // A failed join / kicked-out: drop the saved session so we don't
        // get stuck auto-rejoining a dead room.
        if (!roomRef.current) {
          sessionRef.current = null;
          clearSession();
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    sessionRef.current = loadSession();
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (disposed) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;
      setConnection("connecting");

      ws.onopen = () => {
        if (disposed) {
          ws.close();
          return;
        }
        setConnection("open");
        const queued = queueRef.current;
        queueRef.current = [];
        for (const m of queued) ws.send(JSON.stringify(m));
        const s = sessionRef.current;
        if (s) {
          ws.send(
            JSON.stringify({
              type: "joinRoom",
              code: s.code,
              name: s.name,
              playerId: s.playerId || undefined,
            } satisfies ClientMessage),
          );
        }
      };
      ws.onmessage = (ev) => {
        try {
          handle(JSON.parse(ev.data as string) as ServerEnvelope);
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (disposed) return;
        setConnection("closed");
        retry = setTimeout(connect, 1500);
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retry) clearTimeout(retry);
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null;
        ws.onmessage = null;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, [handle]);

  const joinRoom = useCallback(
    (code: string, name: string) => {
      const cleanCode = code.trim().toUpperCase();
      const cleanName = name.trim().slice(0, 16) || "Player";
      saveName(cleanName);
      sessionRef.current = { code: cleanCode, playerId: "", name: cleanName };
      setLastError(null);
      send({ type: "joinRoom", code: cleanCode, name: cleanName });
    },
    [send],
  );

  const leaveRoom = useCallback(() => {
    send({ type: "leaveRoom" });
    sessionRef.current = null;
    clearSession();
    setRoom(null);
    setYouId(null);
    setLastEvent(null);
    setLastReject(null);
  }, [send]);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  return {
    connection,
    room,
    youId,
    lastEvent,
    lastReject,
    lastError,
    typing,
    serverNow,
    joinRoom,
    leaveRoom,
    send,
  };
}
