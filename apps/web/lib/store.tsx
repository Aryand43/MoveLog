"use client";

import * as React from "react";
import {
  BOXES, CREW, INITIAL_DISCREPANCY, INITIAL_FEED, INITIAL_REPLY, INITIAL_TRANSCRIPT,
  MOVE, OPS_CHANNEL, ROOMS, VOICE_SCRIPT,
  type Box, type Connection, type Discrepancy, type FeedEvent, type OpsNotification, type VoiceStatus,
} from "./demo-data";

/**
 * All console state lives here. No backend and no persistence, so a reload restores
 * the scripted starting point, which is what you want for a repeatable demo.
 *
 * Time is a counter, not `Date.now()`. Every timestamp is derived from
 * `clockMinutes`, so the server and client render identical markup and the
 * demo tells the same story every run.
 */

const START_MINUTES = 10 * 60 + 7; // 10:07

function stamp(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface State {
  hydrating: boolean;
  connection: Connection;
  clockMinutes: number;
  seq: number;
  voice: { status: VoiceStatus; transcript: string; reply: string; at: string };
  scriptIndex: number;
  boxes: Box[];
  feed: FeedEvent[];
  discrepancies: Discrepancy[];
  notifications: OpsNotification[];
  toast: { id: string; text: string; tone: "default" | "success" | "warning" } | null;
  past: Omit<State, "past">[];
}

const base: Omit<State, "past"> = {
  hydrating: true,
  connection: "online",
  clockMinutes: START_MINUTES,
  seq: 0,
  voice: { status: "idle", transcript: INITIAL_TRANSCRIPT, reply: INITIAL_REPLY, at: "09:47" },
  scriptIndex: 0,
  boxes: BOXES,
  feed: INITIAL_FEED,
  discrepancies: [INITIAL_DISCREPANCY],
  notifications: [
    {
      id: "n-1",
      at: "09:50",
      channel: OPS_CHANNEL,
      title: "Discrepancy raised on MV-2291",
      body: "Scratch found on coffee machine (Box 14, Kitchen). Awaiting review.",
      status: "sent",
    },
  ],
  toast: null,
};

export const initialState: State = { ...base, past: [] };

type Action =
  | { type: "hydrated" }
  | { type: "voice/start" }
  | { type: "voice/result" }
  | { type: "photo" }
  | { type: "review" }
  | { type: "undo" }
  | { type: "discrepancy/resolve"; id: string; decision: "confirmed" | "pre_existing" | "awaiting_photo" }
  | { type: "connection"; value: Connection }
  | { type: "toast/clear" };

/** Snapshot for undo. The toast and transient flags never enter history. */
function snapshot(s: State): Omit<State, "past"> {
  const { past: _past, ...rest } = s;
  return { ...rest, toast: null };
}

function withEvent(s: State, minutes: number, e: Omit<FeedEvent, "id" | "at">): FeedEvent[] {
  return [{ id: `ev-${s.seq}`, at: stamp(minutes), ...e }, ...s.feed];
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrated":
      return { ...state, hydrating: false };

    case "connection":
      return { ...state, connection: action.value };

    case "toast/clear":
      return { ...state, toast: null };

    case "voice/start":
      return { ...state, voice: { ...state.voice, status: "listening" } };

    case "voice/result": {
      const turn = VOICE_SCRIPT[state.scriptIndex % VOICE_SCRIPT.length];
      const minutes = state.clockMinutes + 2;
      const seq = state.seq + 1;
      const past = [...state.past, snapshot(state)].slice(-25);

      let boxes = state.boxes;
      let feed = withEvent({ ...state, seq }, minutes, {
        kind: "voice",
        text: "Voice input received",
        detail: turn.transcript,
      });

      if (turn.box) {
        const newBox: Box = {
          id: `box-${turn.box.number}`,
          number: turn.box.number,
          room: turn.box.room,
          items: turn.box.items,
          fragile: turn.box.fragile,
          photos: 0,
          loggedAt: stamp(minutes),
        };
        boxes = [...state.boxes, newBox];
        feed = [
          {
            id: `ev-${seq}-box`,
            at: stamp(minutes),
            kind: "log",
            text: `Box ${turn.box.number} logged`,
            detail: `${turn.box.room} · ${turn.box.items.length} items${turn.box.fragile ? " · fragile" : ""}`,
          },
          ...feed,
        ];
      }

      return {
        ...state,
        past,
        seq,
        clockMinutes: minutes,
        scriptIndex: state.scriptIndex + 1,
        boxes,
        feed,
        voice: { status: "idle", transcript: turn.transcript, reply: turn.reply, at: stamp(minutes) },
        toast: turn.box
          ? { id: `t-${seq}`, text: `Box ${turn.box.number} logged`, tone: "success" }
          : { id: `t-${seq}`, text: "Answered from the manifest", tone: "default" },
      };
    }

    case "photo": {
      const minutes = state.clockMinutes + 1;
      const seq = state.seq + 1;
      const latest = state.boxes[state.boxes.length - 1];
      if (!latest) return state;
      return {
        ...state,
        past: [...state.past, snapshot(state)].slice(-25),
        seq,
        clockMinutes: minutes,
        boxes: state.boxes.map((b) => (b.id === latest.id ? { ...b, photos: b.photos + 1 } : b)),
        feed: withEvent({ ...state, seq }, minutes, {
          kind: "photo",
          text: "Photo captured",
          detail: `Box ${latest.number} · ${latest.room}`,
        }),
        toast: { id: `t-${seq}`, text: `Photo added to Box ${latest.number}`, tone: "success" },
      };
    }

    case "review": {
      const minutes = state.clockMinutes + 1;
      const seq = state.seq + 1;
      const latest = state.boxes[state.boxes.length - 1];
      if (!latest) return state;
      const id = `d-${seq + 1}`;
      const at = stamp(minutes);
      const item = latest.items[0] ?? "Item";

      const discrepancy: Discrepancy = {
        id,
        title: `Review requested on ${item.toLowerCase()}`,
        item,
        boxNumber: latest.number,
        room: latest.room,
        reportedAt: at,
        status: "awaiting_photo",
        photoRequests: 1,
        assessment: {
          damageType: "Not yet assessed",
          location: "Not assessed",
          severity: "Minor",
          surveyMatch: "Not checked",
          confidence: 0,
        },
        timeline: [
          { id: `${id}-1`, at, kind: "human", text: "Marked for review", detail: `${item} → Box ${latest.number}` },
          { id: `${id}-2`, at, kind: "system", text: "Photo requested", detail: "Packer prompted on the voice page" },
        ],
      };

      return {
        ...state,
        past: [...state.past, snapshot(state)].slice(-25),
        seq,
        clockMinutes: minutes,
        boxes: state.boxes.map((b) => (b.id === latest.id ? { ...b, flagged: true } : b)),
        discrepancies: [discrepancy, ...state.discrepancies],
        feed: withEvent({ ...state, seq }, minutes, {
          kind: "human",
          text: "Marked for review",
          detail: `Box ${latest.number} · ${item}`,
        }),
        toast: { id: `t-${seq}`, text: "Sent to Discrepancy Review", tone: "warning" },
      };
    }

    case "discrepancy/resolve": {
      const minutes = state.clockMinutes + 1;
      const seq = state.seq + 1;
      const at = stamp(minutes);
      const target = state.discrepancies.find((d) => d.id === action.id);
      if (!target) return state;

      const label =
        action.decision === "confirmed"
          ? "Discrepancy confirmed"
          : action.decision === "pre_existing"
            ? "Marked as pre-existing"
            : "Another photo requested";

      const timeline: FeedEvent[] = [
        ...target.timeline,
        { id: `${target.id}-h${seq}`, at, kind: "human", text: label, detail: "Priya Nair (ops coordinator)" },
      ];

      const notifications = [...state.notifications];
      if (action.decision !== "awaiting_photo") {
        timeline.push({
          id: `${target.id}-o${seq}`,
          at,
          kind: "ops",
          text: `Posted to ${OPS_CHANNEL}`,
          detail: action.decision === "confirmed" ? "Claim opened, customer notified" : "Logged against the survey",
        });
        notifications.unshift({
          id: `n-${seq}`,
          at,
          channel: OPS_CHANNEL,
          title: `${label} · ${MOVE.id}`,
          body: `${target.item} (Box ${target.boxNumber}, ${target.room}). Decided by Priya Nair.`,
          status: "sent",
        });
      }

      return {
        ...state,
        past: [...state.past, snapshot(state)].slice(-25),
        seq,
        clockMinutes: minutes,
        discrepancies: state.discrepancies.map((d) =>
          d.id === action.id
            ? {
                ...d,
                status: action.decision,
                decidedBy: action.decision === "awaiting_photo" ? undefined : "Priya Nair",
                photoRequests: action.decision === "awaiting_photo" ? d.photoRequests + 1 : d.photoRequests,
                timeline,
              }
            : d
        ),
        feed: withEvent({ ...state, seq }, minutes, {
          kind: action.decision === "awaiting_photo" ? "system" : "human",
          text: label,
          detail: `${target.item} · Box ${target.boxNumber}`,
        }),
        toast: {
          id: `t-${seq}`,
          text: action.decision === "awaiting_photo" ? "Photo requested from packer" : `${label} · sent to ${OPS_CHANNEL}`,
          tone: action.decision === "confirmed" ? "warning" : "success",
        },
      };
    }

    case "undo": {
      const prev = state.past[state.past.length - 1];
      if (!prev) return { ...state, toast: { id: `t-u`, text: "Nothing left to undo", tone: "default" } };
      return {
        ...prev,
        past: state.past.slice(0, -1),
        toast: { id: `t-u${state.seq}`, text: "Last action undone", tone: "default" },
      };
    }

    default:
      return state;
  }
}

const StoreContext = React.createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
  pushToTalk: () => void;
} | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  // Brief hydrate so the skeleton states are real, not decorative.
  React.useEffect(() => {
    const t = setTimeout(() => dispatch({ type: "hydrated" }), 650);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: "toast/clear" }), 3200);
    return () => clearTimeout(t);
  }, [state.toast]);

  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pushToTalk = React.useCallback(() => {
    dispatch({ type: "voice/start" });
    const t = setTimeout(() => dispatch({ type: "voice/result" }), 1500);
    timers.current.push(t);
  }, []);

  const value = React.useMemo(() => ({ state, dispatch, pushToTalk }), [state, pushToTalk]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export const helpers = { stamp, MOVE, CREW, ROOMS };
