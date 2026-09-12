"use client";

import * as React from "react";
import { API } from "./api";
import {
  OPS_CHANNEL,
  type Box, type Connection, type ConsolePayload, type Counts, type Discrepancy,
  type FeedEvent, type MoveDetail, type MoveSummary, type OpsNotification, type VoiceState,
} from "./model";

/**
 * Live console state. Everything here comes from the backend on a 2s poll, so
 * what ops see is what the packer actually said and what ClickHouse actually
 * holds — no local simulation, and nothing that survives a reload except what
 * the server knows.
 */

const POLL_MS = 2_000;

export interface State {
  hydrating: boolean;
  connection: Connection;
  moveId: string;
  moves: MoveSummary[];
  move: MoveDetail | null;
  counts: Counts;
  voice: VoiceState;
  boxes: Box[];
  discrepancies: Discrepancy[];
  feed: FeedEvent[];
  notifications: OpsNotification[];
  toast: { id: string; text: string; tone: "default" | "success" | "warning" } | null;
  /** Retained so existing components compile; live data has no undo history. */
  past: never[];
}

const EMPTY_COUNTS: Counts = { boxesClosed: 0, boxesOpen: 0, items: 0, openDiscrepancies: 0 };

export const initialState: State = {
  hydrating: true,
  connection: "online",
  moveId: "",
  moves: [],
  move: null,
  counts: EMPTY_COUNTS,
  voice: { status: "offline", transcript: "", reply: "", at: "" },
  boxes: [],
  discrepancies: [],
  feed: [],
  notifications: [],
  toast: null,
  past: [],
};

type Action =
  | { type: "moves"; moves: MoveSummary[] }
  | { type: "move/select"; id: string }
  | { type: "data"; payload: ConsolePayload }
  | { type: "connection"; value: Connection }
  | { type: "toast"; text: string; tone?: "default" | "success" | "warning" }
  | { type: "toast/clear" };

/**
 * What ops were told, derived from what actually happened. A card is posted to
 * the group when a discrepancy is assessed, so these mirror that rather than
 * inventing a notification feed.
 */
function notificationsFrom(discrepancies: Discrepancy[], moveId: string): OpsNotification[] {
  return discrepancies
    .filter((d) => d.assessment !== null)
    .slice(0, 8)
    .map((d) => ({
      id: `n-${d.id}`,
      at: d.reportedAt,
      channel: OPS_CHANNEL,
      title: `${d.item} — ${d.assessment?.severity ?? ""} ${d.assessment?.damageType ?? ""}`.trim(),
      body: d.decidedBy
        ? `Decided by ${d.decidedBy} on ${moveId}.`
        : `Awaiting a decision on ${moveId}.`,
      status: "sent" as const,
    }));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "moves":
      return {
        ...state,
        moves: action.moves,
        // Fall back to the first move so a fresh load always shows something.
        moveId: state.moveId || action.moves[0]?.id || "",
      };

    case "move/select":
      return { ...state, moveId: action.id, hydrating: true };

    case "data":
      return {
        ...state,
        hydrating: false,
        connection: "online",
        move: action.payload.move,
        counts: action.payload.counts,
        voice: action.payload.voice,
        boxes: action.payload.boxes,
        discrepancies: action.payload.discrepancies,
        feed: action.payload.feed,
        notifications: notificationsFrom(action.payload.discrepancies, action.payload.move.id),
      };

    case "connection":
      return { ...state, connection: action.value };

    case "toast":
      return {
        ...state,
        toast: { id: `t-${Date.now()}`, text: action.text, tone: action.tone ?? "default" },
      };

    case "toast/clear":
      return { ...state, toast: null };

    default:
      return state;
  }
}

interface StoreValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  /** Record an ops decision. Same path the Telegram button takes. */
  resolve: (id: string, decision: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const StoreContext = React.createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const moveId = state.moveId;

  const refresh = React.useCallback(async () => {
    if (!moveId) return;
    try {
      const res = await fetch(`${API}/api/console/${moveId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      dispatch({ type: "data", payload: (await res.json()) as ConsolePayload });
    } catch {
      dispatch({ type: "connection", value: "offline" });
    }
  }, [moveId]);

  // The move list, once.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API}/api/console/moves`, { cache: "no-store" });
        const body = (await res.json()) as { moves: MoveSummary[] };
        if (!cancelled) dispatch({ type: "moves", moves: body.moves });
      } catch {
        if (!cancelled) dispatch({ type: "connection", value: "offline" });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Poll the selected move. Cheap enough at 2s, and it is what makes the feed
  // move while the packer is talking.
  React.useEffect(() => {
    if (!moveId) return;
    void refresh();
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [moveId, refresh]);

  const resolve = React.useCallback(async (id: string, decision: string) => {
    try {
      const res = await fetch(`${API}/api/discrepancy/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, by: "console" }),
      });
      if (!res.ok) throw new Error(await res.text());
      dispatch({ type: "toast", text: "Decision sent to the packer.", tone: "success" });
      await refresh();
    } catch (err) {
      dispatch({
        type: "toast",
        text: `Could not record the decision: ${err instanceof Error ? err.message : String(err)}`,
        tone: "warning",
      });
    }
  }, [refresh]);

  const value = React.useMemo(
    () => ({ state, dispatch, resolve, refresh }),
    [state, resolve, refresh],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
