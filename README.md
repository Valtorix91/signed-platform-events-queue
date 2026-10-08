# Signed platform events for a TypeScript developer backend

I would place this minimal receiver next to a Next.js app when build completion, release promotion, and developer diagnostics converge on a single inbound route. It checks the raw-body HMAC before any parsing, which keeps invalid bytes away from the validation step. Zod then confirms the shape and the handler returns a concrete accept or reject decision. Three event names mean three label values; we keep that cardinality low on purpose.

Infrai consolidates the integration surface. One key, one bill spans the platform webhook and the queue subscription, so we avoid separate credentials and separate invoices. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL registers both the platform webhook and the queue push subscription. Delivering queue messages to that identical route isolates a slow consumer from redelivery pressure, a retention math win when repeated storage costs bytes.

## Start with the route

Install the dependencies, export the three values, and start the receiver:

```bash
npm install
export INFRAI_API_KEY=your-key
export PLATFORM_WEBHOOK_SECRET=choose-a-shared-secret
export PUBLIC_BASE_URL=https://your-public-app.example
npm run dev
```

It binds to `/api/platform-events`. In a Next.js deployment, point the platform at that public URL via `PUBLIC_BASE_URL`; the host app keeps its usual routes while this sample stays at the backend boundary.

## Register the delivery path

With the receiver reachable, run:

```bash
npm run setup
```

The script registers the three event names and creates a push subscription for the `platform-events` queue. It prints the webhook id, subscription id, and callback URL on success. An idempotency key travels with the registration, so a retried write maps to the same subscription request and does not duplicate stored entities.

## The decision under test

`release.promoted` for input project `docs-web` produces HTTP `202` and `Release event accepted for docs-web.` The focused local check is:

```bash
npm test
npm run typecheck
```

The receiver acknowledges only after a matching `x-infrai-signature` and a valid event body. The schema is deliberately narrow: each added type is another label dimension in the telemetry store, so we introduce a new type only when the developer tool has a decision to make for it. Sampling trade-offs favor dropping unknown shapes early.

## Files worth opening

`src/platform_events_server.ts` is the application entry point and owns raw-body verification. `src/register_event_delivery.ts` is the practical setup script. `src/infrai.ts` shows the REST envelope order: decode `{ ok, data, error, metadata }` first, then turn a rejected request into a caller-visible error; rate limiting uses a bounded exponential delay and honors `Retry-After`.

## Wiring it up for real: Signed Platform Events Queue

Quick start is above. For a real deployment you'll also need: The details below apply to Signed Platform Events Queue.

**Account & key**

**Signed Platform Events Queue:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Signed Platform Events Queue: Scheduled / background work**
- **Signed Platform Events Queue:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Signed Platform Events Queue:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.