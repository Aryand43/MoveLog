import { createChannel, type Channel } from "@copilotkit/channels";
import { telegram, type TelegramAdapter } from "@copilotkit/channels/telegram";
import { CopilotKitIntelligence, CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotNodeListener } from "@copilotkit/runtime/v2/node";
import { env } from "../env.js";
import { getMoveByToken, moveForChat, setCustomerChat } from "../db/queries.js";
import { DEMO_MOVE_ID } from "../db/seed.js";
import { customerAgent, opsAgent } from "./agents.js";
import { channelTools } from "./tools.js";

/** Set once at boot so post.ts can reach the same bot connection. */
export let adapter: TelegramAdapter | null = null;
export let channel: Channel | null = null;

let stop: (() => Promise<void>) | null = null;

/** Telegram's conversation key is `tg:<chatId>:<scope>`. */
const chatIdOf = (conversationKeyOrRef: string): string => conversationKeyOrRef.split(":")[1] ?? "";

const isOpsChat = (chatId: string): boolean =>
  env.OPS_CHAT_ID !== undefined && chatId === env.OPS_CHAT_ID;

/** Chat ids seen this process, logged once each — this is how OPS_CHAT_ID is captured. */
const seenChats = new Set<string>();

export async function startChannels(): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.COPILOTKIT_API_KEY) {
    console.warn("[channels] TELEGRAM_BOT_TOKEN or COPILOTKIT_API_KEY missing — Telegram disabled");
    return;
  }

  adapter = telegram({ token: env.TELEGRAM_BOT_TOKEN });

  channel = createChannel({
    name: "movelog",
    identifyUser: "platform",
    adapters: [adapter],
    // Per-turn clone; ops and customer differ only in prompt and toolset.
    agent: (threadId) => (isOpsChat(chatIdOf(threadId)) ? opsAgent : customerAgent),
  });

  channel.onMessage(async ({ thread, message }) => {
    // thread.conversationKey is "tg:<chatId>:<scope>" and is always populated;
    // message.ref.chatId is not, and an empty id here used to match any move
    // whose customer_chat_id was still unset.
    const chatId = chatIdOf(thread.conversationKey);
    if (chatId && !seenChats.has(chatId)) {
      seenChats.add(chatId);
      console.log(`[channels] chat ${chatId} ${isOpsChat(chatId) ? "(ops group)" : ""}`);
    }

    // Deep link from the handover QR: /start <customer_token> binds this chat to a move.
    const start = message.text.match(/^\/start(?:@\S+)?\s+(\S+)/);
    if (start?.[1]) {
      const move = await getMoveByToken("customer_token", start[1]);
      if (!move) {
        await thread.post("I couldn't find that move. Please check the link from your mover.");
        return;
      }
      await setCustomerChat(move.move_id, chatId);
      await thread.post(
        `Hi ${move.customer_name} — I'm tracking your move to ${move.address}. ` +
          `Ask me where anything is and I'll tell you which box it's in.`,
      );
      return;
    }

    if (isOpsChat(chatId)) {
      // Ops may ask about any move, so the tool context carries the demo move as
      // a default; run_select reaches the rest.
      const ctx = {
        moveId: DEMO_MOVE_ID, actorId: message.actor?.name ?? "ops",
        actorType: "ops" as const, utterance: message.text,
      };
      await thread.runAgent({
        context: [
          { description: "Surface", value: "Ops team group chat." },
          { description: "Default move when none is named", value: DEMO_MOVE_ID },
        ],
        tools: channelTools("ops", ctx),
      });
      return;
    }

    const move = chatId ? await moveForChat(chatId) : null;
    if (!move) {
      await thread.post(
        "Open the link your mover sent you to connect this chat to your move.",
      );
      return;
    }

    await thread.runAgent({
      context: [
        { description: "Surface", value: "Private chat with the customer." },
        { description: "The only move you may discuss", value: move.move_id },
        { description: "Customer name", value: move.customer_name },
      ],
      tools: channelTools("customer", {
        moveId: move.move_id, actorId: chatId, actorType: "customer", utterance: message.text,
      }),
    });
  });

  const runtime = new CopilotRuntime({
    agents: { movelog: opsAgent },
    intelligence: new CopilotKitIntelligence({ apiKey: env.COPILOTKIT_API_KEY }),
    channels: [channel],
  });

  // Creating the listener starts the channel connection; there is no channel.start().
  const listener = createCopilotNodeListener({ runtime });
  await listener.channels.ready({ timeoutMs: 30_000 });

  // "online" certifies the MANAGED Intelligence provider, which we don't use: our
  // Telegram adapter is a direct adapter. When the managed provider reports
  // setup_required, the runtime still starts the direct adapters (see
  // channel-manager's isSetupRequired branch) — polling is live and that status is
  // the expected steady state for us. Only a hard error means the bot is deaf.
  const status = listener.channels.status();
  if (status.overall === "error" || status.overall === "stopped") {
    throw new Error(`[channels] failed to start: ${JSON.stringify(status)}`);
  }
  console.log(`[channels] telegram polling (managed provider: ${status.overall})`);

  stop = async () => {
    await listener.channels.stop();
  };
}

export async function stopChannels(): Promise<void> {
  await stop?.();
}
