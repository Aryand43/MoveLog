import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { getMoveByToken } from "../db/queries.js";
import { attachPhone, isPaused } from "../live/registry.js";

/**
 * The packer's phone page holds this socket open so the backend can push it
 * control messages — chiefly `{type:"camera"}` when a defect needs a photo.
 * Addressed by the packer token, same opaque credential as the page itself.
 */
export function attachPhoneSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/pack-ws") return;

    const token = url.searchParams.get("token");
    if (!token) {
      socket.destroy();
      return;
    }

    void (async () => {
      const move = await getMoveByToken("packer_token", token);
      if (!move) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        const detach = attachPhone(move.move_id, (msg) => {
          if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
        });

        console.log(`[ws] phone attached for ${move.move_id}`);
        ws.send(JSON.stringify({ type: "ready", move_id: move.move_id, paused: isPaused(move.move_id) }));

        // Keep intermediaries from idling the socket out mid-shift.
        const ping = setInterval(() => {
          if (ws.readyState === ws.OPEN) ws.ping();
        }, 30_000);

        ws.on("close", () => {
          clearInterval(ping);
          detach();
          console.log(`[ws] phone detached for ${move.move_id}`);
        });
      });
    })();
  });
}
