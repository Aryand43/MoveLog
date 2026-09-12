# Verified API notes

Read from the installed packages and the live docs, not from memory. Where these
contradict PLAN.md §2, these win.

## CopilotKit Channels 0.9.2 (read from node_modules typings + README)

Corrections to PLAN.md:

- `identifyUser` and the adapters belong to `createChannel`, **not** `CopilotRuntime`:
  ```ts
  const adapter = telegram({ token });               // option is `token`, polling by default
  const channel = createChannel({ name, identifyUser: "platform", adapters: [adapter] });
  const runtime = new CopilotRuntime({ intelligence: new CopilotKitIntelligence({ apiKey }), channels: [channel] });
  const listener = createCopilotNodeListener({ runtime });
  await listener.channels.ready();                   // listener.channels.stop() tears down
  ```
- Imports are from `@copilotkit/runtime/v2` and `@copilotkit/runtime/v2/node` (not the root).
- tsconfig needs `"jsx": "react-jsx"` **and** `"jsxImportSource": "@copilotkit/channels"`.
- There is no `channel.start()` — the runtime owns the lifecycle (`channel.ɵruntime` is internal).

### Proactive posting to a known chat id (PLAN's open question (a))

`Channel` has **no** public API to get a `Thread` for an arbitrary chat id — threads only
arrive through handlers. But `TelegramAdapter` exposes public egress, so we keep our own
reference to the adapter we constructed:

```ts
const ir = renderToIR(<DiscrepancyCard … />);
const ref = await adapter.post({ chatId: OPS_CHAT_ID }, ir);   // MessageRef
await adapter.update(ref, renderToIR(<DiscrepancyCard … decided />));  // Phase 5 card edit
```

Same grammY bot, one poller, no raw Bot API fallback, and `update` gives us the
"card shows the decision" step for free.

### Buttons (PLAN's open question (b))

- `ButtonProps`: `{ onClick?, value?, url?, style? }` — no `id`. Inline `onClick` is wired by
  the internal `ActionRegistry` during `bindRenderable`, which `renderToIR` alone does **not**
  do. So an inline `onClick` on a card we post via `adapter.post` is not guaranteed to fire.
- Reliable path: Telegram's `decodeInteraction` sets `InteractionEvent.id = callback_query.data`
  verbatim, and `channel.onInteraction(id, handler)` is keyed on that id. So mint our own
  short `callbackData` and register a matching handler.
- **Telegram caps `callback_data` at 64 bytes** — keep ids like `d:<short>:wrap`.
- Adapter subscribes to `message`, `edited_message`, `callback_query`, `message_reaction`.
- Group chats: the bot must be an admin to receive `message_reaction` updates.

### Conversation keying

Non-forum groups key conversations by **sender user id** (`user:<id>`), so each ops person
has their own thread in the group. DMs use scope `"dm"`.

## OpenAI Live delegation (confirmed against the guide)

Matches PLAN.md §2:
- `{ model: "gpt-live-1", delegation: { type: "responses", responses: { model, instructions, tools } } }`
- Read completed calls from nested `response.output_item.done` (`call_id`, `name`, `arguments`);
  an arguments-done event alone is not enough to identify the call.
- Reply with `{ type: "function_call_output", call_id, output }`, then an explicit `response.create`.
- Delegated events arrive as `{ type: "response.event", event_id, delegation_id, event }` —
  dispatch on `envelope.event.type`, keep the outer `delegation_id`.
- `session.commentary.append` (spoken) / `thinking.append` (silent context) /
  `instructions.append` (behaviour), each `{ delegation_id, content }`, max 500 tokens.
- The guide's own example uses `gpt-5.6-terra` as the backend model; we use `gpt-5.6-luna`
  per PLAN.md §2, which is vision-capable (we need that for photo assessment).

## Modal

- `web_server(port, *, startup_timeout=5.0, label=None, custom_domains=None, requires_proxy_auth=False)`
- `Secret.from_dotenv(path=None, *, filename=".env")` — walks upward from the given file or
  directory, so `from_dotenv(__file__)` picks up the repo-root `.env`. No `modal secret create` step.
- URLs: deployed `https://<workspace>--movelog-backend.modal.run`;
  `modal serve` appends `-dev` → `https://<workspace>--movelog-backend-dev.modal.run`.
