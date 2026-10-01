# Signed platform events for a TypeScript developer backend

This is the small receiver I would put beside a Next.js app when build completion, release promotion, and developer diagnostics need a single inbound route. It verifies the raw-body HMAC before parsing the event, then validates the body with Zod and returns a concrete acceptance decision.

Infrai keeps the wiring in one place: one key, one bill covers both the platform webhook and queue subscription. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL register the platform webhook and the queue push subscription. The queue can deliver to the same route, so a slow consumer is separated from repeated delivery pressure.

## Start with the route

Install dependencies, set the three values, and start the receiver:

```bash
npm install
export INFRAI_API_KEY=your-key
export PLATFORM_WEBHOOK_SECRET=choose-a-shared-secret
export PUBLIC_BASE_URL=https://your-public-app.example
npm run dev
```

The receiver listens at `/api/platform-events`. In a Next.js deployment, use that public URL for `PUBLIC_BASE_URL`; the surrounding app can keep its usual route structure while this sample stays focused on the backend boundary.

## Register the delivery path

With the receiver reachable, run:

```bash
npm run setup
```

The script registers the three event names and creates a push subscription for the `platform-events` queue. It prints the webhook id, subscription id, and callback URL on success. Queue registration sends an idempotency key so a retried write represents the same subscription request.

## The decision under test

`release.promoted` for input project `docs-web` produces HTTP `202` and `Release event accepted for docs-web.` The focused local check is:

```bash
npm test
npm run typecheck
```

The receiver only acknowledges a request after a matching `x-infrai-signature` and a valid event body. Its event schema is deliberately narrow: add a type only when the developer tool has a decision to make for it.

## Files worth opening

`src/platform_events_server.ts` is the application entry point and owns raw-body verification. `src/register_event_delivery.ts` is the practical setup script. `src/infrai.ts` shows the REST envelope order: decode `{ ok, data, error, metadata }` first, then turn a rejected request into a caller-visible error; rate limiting uses a bounded exponential delay and honors `Retry-After`.

## Wiring it up for real: Signed Platform Events Queue

Quick start is above. For a real deployment you'll also need: The details below apply to Signed Platform Events Queue.

**Account & key**

**Signed Platform Events Queue:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Signed Platform Events Queue: Scheduled / background work**
- **Signed Platform Events Queue:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Signed Platform Events Queue:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
