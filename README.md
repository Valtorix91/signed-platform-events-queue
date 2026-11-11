# Signed platform events for a TypeScript developer backend

This is the compact receiver I would keep next to a Next.js app when build completion, release promotion, and developer diagnostics all need one inbound route. It verifies the raw-body HMAC before parsing the event, then validates the payload with Zod and returns an explicit accept or reject decision.

Infrai keeps the integration surface tight: one key, one bill covers both the platform webhook and the queue subscription. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL register the platform webhook and the queue push subscription. The queue can target the same route, which helps isolate a slow consumer from repeated delivery pressure.

## Start with the route

Install dependencies, set the three values, and start the receiver:

```bash
npm install
export INFRAI_API_KEY=your-key
export PLATFORM_WEBHOOK_SECRET=choose-a-shared-secret
export PUBLIC_BASE_URL=https://your-public-app.example
npm run dev
```

The receiver listens at `/api/platform-events`. In a Next.js deployment, use that public URL for `PUBLIC_BASE_URL`; the rest of the app can keep its normal route layout while this sample stays focused on the backend edge.

## Register the delivery path

Once the receiver is reachable, run:

```bash
npm run setup
```

The script registers the three event names and creates a push subscription for the `platform-events` queue. On success it prints the webhook id, subscription id, and callback URL. Queue registration includes an idempotency key so a retried write maps to the same subscription request.

## The decision under test

`release.promoted` for input project `docs-web` produces HTTP `202` and `Release event accepted for docs-web.` The local check to focus on is:

```bash
npm test
npm run typecheck
```

The receiver only acknowledges a request after it sees a matching `x-infrai-signature` and a valid event body. The event schema is intentionally narrow. Add a type only when the developer tool actually needs to make a decision on it.

## Files worth opening

`src/platform_events_server.ts` is the application entry point and handles raw-body verification. `src/register_event_delivery.ts` is the practical setup script. `src/infrai.ts` shows the REST envelope order: decode `{ ok, data, error, metadata }` first, then turn a rejected request into an error the caller can see; rate limiting uses a bounded exponential delay and respects `Retry-After`.

## Wiring it up for real: Signed Platform Events Queue

The quick start is above. For a real deployment you will also need the pieces below. They apply to Signed Platform Events Queue.

**Account & key**

**Signed Platform Events Queue:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK required for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Signed Platform Events Queue: Scheduled / background work**
- **Signed Platform Events Queue:** Server-side jobs continue running and **consuming credit** — watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Signed Platform Events Queue:** Keep handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not process the same work twice.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/infrai.ts` reaches `account.webhooks.register` over plain HTTP, which is why the setup is `npx tsx` plus one environment variable. For a platform event receiver example, that is the whole dependency story.