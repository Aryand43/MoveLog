"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "connecting" | "live" | "error";

export default function PackClient({ token, apiUrl }: { token: string; apiUrl: string }) {
  const API = apiUrl.replace(/\/$/, "");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState(0);
  const [rtc, setRtc] = useState<RTCPeerConnectionState | "">("");
  const [needsSound, setNeedsSound] = useState(false);
  const [cameraFor, setCameraFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastUpload, setLastUpload] = useState<string>("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /** Mute the mic locally when paused — crew chatter never leaves the phone. */
  useEffect(() => {
    for (const t of streamRef.current?.getAudioTracks() ?? []) t.enabled = !paused;
  }, [paused]);

  const start = useCallback(async () => {
    // Pressing Start twice used to leave two live sessions on the same move,
    // each with its own sideband, and audio attached to only one of them.
    pcRef.current?.close();
    pcRef.current = null;
    for (const t of streamRef.current?.getTracks() ?? []) t.stop();
    streamRef.current = null;

    setStatus("connecting");
    setError("");
    try {
      // Prime the element during the tap: mobile grants playback to a gesture.
      if (audioRef.current) {
        audioRef.current.muted = false;
        await audioRef.current.play().catch(() => undefined);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // Without a STUN server the offer carries host candidates only, which is
      // fragile on mobile networks.
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      // The model's voice comes back on this track. It must play through a real
      // <audio> element in the DOM: a detached `new Audio()` is refused by mobile
      // browsers, which is silent — the model answers and the packer hears nothing.
      pc.ontrack = (e) => {
        const el = audioRef.current;
        if (!el) return;
        el.srcObject = e.streams[0] ?? null;
        void el.play().catch((err) => {
          setError(`Tap "Enable sound" — playback blocked: ${String(err)}`);
          setNeedsSound(true);
        });
      };

      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      await iceSettled(pc);

      // Our backend exchanges the offer using the project key; the browser never
      // holds an OpenAI credential.
      const res = await fetch(`${API}/live/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sdp: pc.localDescription?.sdp }),
      });
      if (!res.ok) throw new Error(`session failed: ${res.status} ${await res.text()}`);

      const { sdp } = (await res.json()) as { sdp: string };
      await pc.setRemoteDescription({ type: "answer", sdp });

      meter(stream, setLevel);
      wakeRef.current = await requestWakeLock();

      // "live" means the media path is actually up. Reporting it on the SDP
      // answer alone was a lie: the session existed but no audio ever flowed,
      // and the page looked fine while the packer talked to nothing.
      pc.onconnectionstatechange = () => {
        setRtc(pc.connectionState);
        if (pc.connectionState === "connected") setStatus("live");
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStatus("error");
          setError(`Media connection ${pc.connectionState}. Tap Stop, then Start again.`);
        }
      };
      setRtc(pc.connectionState);
      if (pc.connectionState === "connected") setStatus("live");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [token, API]);

  const stop = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    for (const t of streamRef.current?.getTracks() ?? []) t.stop();
    streamRef.current = null;
    void wakeRef.current?.release().catch(() => undefined);
    wakeRef.current = null;
    setStatus("idle");
    setLevel(0);
  }, []);

  /** Control socket: the backend opens the camera through this. */
  useEffect(() => {
    const url = `${API.replace(/^http/, "ws")}/pack-ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as { type: string; discrepancy_id?: string; paused?: boolean };
        if (msg.type === "camera" && msg.discrepancy_id) setCameraFor(msg.discrepancy_id);
        if (msg.type === "paused") setPaused(!!msg.paused);
      } catch {
        /* ignore malformed control frames */
      }
    };
    return () => ws.close();
  }, [token, API]);

  const upload = useCallback(async (file: File) => {
    if (!cameraFor) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch(`${API}/photo/${cameraFor}`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      setLastUpload("Photo sent — ops have it.");
      setCameraFor(null);
    } catch (err) {
      setLastUpload(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [cameraFor, API]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {needsSound && (
        <button
          onClick={() => {
            void audioRef.current?.play().then(() => {
              setNeedsSound(false);
              setError("");
            });
          }}
          className="rounded-xl bg-sky-500 py-4 text-lg font-semibold text-black"
        >
          Enable sound
        </button>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">MoveLog</h1>
        <span
          className={`rounded-full px-3 py-1 text-sm ${
            status === "live" ? "bg-emerald-500/20 text-emerald-300"
            : status === "connecting" ? "bg-amber-500/20 text-amber-300"
            : status === "error" ? "bg-red-500/20 text-red-300"
            : "bg-neutral-800 text-neutral-400"
          }`}
        >
          {status}
          {rtc && rtc !== "connected" ? ` · ${rtc}` : ""}
        </span>
      </header>

      {paused && (
        <div className="rounded-lg bg-amber-500/15 p-4 text-center text-amber-200">
          Paused — mic is muted. Say &ldquo;okay, back&rdquo; to resume.
        </div>
      )}

      <div className="h-3 overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full bg-emerald-400 transition-[width] duration-75"
          style={{ width: `${Math.min(100, Math.round(level * 140))}%` }}
        />
      </div>

      {status === "live" ? (
        <button onClick={stop} className="rounded-2xl bg-red-600 py-10 text-2xl font-semibold active:scale-[0.99]">
          Stop
        </button>
      ) : (
        <button
          onClick={start}
          disabled={status === "connecting"}
          className="rounded-2xl bg-emerald-600 py-10 text-2xl font-semibold disabled:opacity-50 active:scale-[0.99]"
        >
          {status === "connecting" ? "Connecting…" : "Start packing"}
        </button>
      )}

      {cameraFor && (
        <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-amber-200">Photo needed for the damage you just reported.</p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-xl bg-amber-500 py-6 text-xl font-semibold text-black disabled:opacity-50"
          >
            {uploading ? "Sending…" : "Take photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
        </div>
      )}

      {lastUpload && <p className="text-center text-sm text-neutral-400">{lastUpload}</p>}
      {error && <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{error}</p>}

      <p className="mt-auto text-center text-sm text-neutral-500">
        Keep the phone in your pocket. Narrate as you pack: &ldquo;Box twelve, kitchen,
        glasses, blender, fragile.&rdquo;
      </p>
    </main>
  );
}

/** Wait for ICE gathering so the offer we send is complete. */
function iceSettled(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", done);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", done);
    // Don't stall the session on a slow STUN server.
    setTimeout(resolve, 5000);
  });
}

function meter(stream: MediaStream, onLevel: (v: number) => void): void {
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser);
  const buf = new Uint8Array(analyser.frequencyBinCount);

  const tick = () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += (v - 128) ** 2;
    onLevel(Math.sqrt(sum / buf.length) / 128);
    requestAnimationFrame(tick);
  };
  tick();
}

async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}
