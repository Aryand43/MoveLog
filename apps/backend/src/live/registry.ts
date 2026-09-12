/**
 * The live voice sessions this process is holding, keyed by move.
 *
 * The Telegram button handler reaches the packer's earbuds through here — one
 * process, one map, no queue and no second service (see PLAN §10). Everything
 * degrades to a logged no-op when no session is attached, so tools work
 * identically from the ops chat when nobody is wearing the earbuds.
 */
export interface LiveSession {
  /** The Live session id this entry belongs to, so a stale socket cannot evict a newer one. */
  sessionId: string;
  moveId: string;
  packerId: string;
  loggingPaused: boolean;
  /** Speak a line into the packer's session (Live `session.commentary.append`). */
  say(text: string): Promise<void>;
  /** Quiet context the model may use but must not read aloud. */
  think?(text: string): Promise<void>;
  /** Last thing the packer said and the agent's reply, for the ops console. */
  lastHeard?: string;
  lastSaid?: string;
  lastAt?: string;
  close(): void;
}

const sessions = new Map<string, LiveSession>();

/** Phone page sockets, so a tool can pop the camera open on the packer's phone. */
type PhonePush = (msg: unknown) => void;
const phones = new Map<string, Set<PhonePush>>();

export const registerSession = (s: LiveSession): void => {
  sessions.get(s.moveId)?.close();
  sessions.set(s.moveId, s);
};

export const unregisterSession = (moveId: string, sessionId?: string): void => {
  const current = sessions.get(moveId);
  if (!current) return;
  if (sessionId && current.sessionId !== sessionId) return; // a newer session took over
  sessions.delete(moveId);
};

export const getSession = (moveId: string): LiveSession | undefined => sessions.get(moveId);

export const activeMoves = (): string[] => [...sessions.keys()];

/** Speak into the packer's live session. Safe to call when nobody is connected. */
export async function say(moveId: string, text: string): Promise<boolean> {
  const s = sessions.get(moveId);
  if (!s) {
    console.log(`[live] no session for ${moveId}; would have said: ${text}`);
    return false;
  }
  try {
    await s.say(text);
    return true;
  } catch (err) {
    console.error(`[live] say failed for ${moveId}:`, err);
    return false;
  }
}

export const isPaused = (moveId: string): boolean => sessions.get(moveId)?.loggingPaused ?? false;

export function setPaused(moveId: string, paused: boolean): void {
  const s = sessions.get(moveId);
  if (s) s.loggingPaused = paused;
}

export function attachPhone(moveId: string, push: PhonePush): () => void {
  const set = phones.get(moveId) ?? new Set();
  set.add(push);
  phones.set(moveId, set);
  return () => {
    set.delete(push);
    if (set.size === 0) phones.delete(moveId);
  };
}

/** Push a control message to every phone page open for this move. */
export function pushToPhone(moveId: string, msg: unknown): boolean {
  const set = phones.get(moveId);
  if (!set || set.size === 0) {
    console.log(`[live] no phone attached for ${moveId}; dropped`, msg);
    return false;
  }
  for (const push of set) {
    try {
      push(msg);
    } catch (err) {
      console.error(`[live] phone push failed for ${moveId}:`, err);
    }
  }
  return true;
}

export type VoiceStatus = "idle" | "listening" | "processing" | "offline";

/** What the packer just said, so the console can show the live conversation. */
export function noteTranscript(moveId: string, kind: "heard" | "said", text: string): void {
  const s = sessions.get(moveId);
  if (!s || !text) return;
  if (kind === "heard") s.lastHeard = text;
  else s.lastSaid = text;
  s.lastAt = new Date().toISOString().slice(11, 16);
}

export function voiceState(moveId: string): {
  status: VoiceStatus;
  transcript: string;
  reply: string;
  at: string;
} {
  const s = sessions.get(moveId);
  if (!s) return { status: "offline", transcript: "", reply: "", at: "" };
  return {
    status: s.loggingPaused ? "idle" : "listening",
    transcript: s.lastHeard ?? "",
    reply: s.lastSaid ?? "",
    at: s.lastAt ?? "",
  };
}
