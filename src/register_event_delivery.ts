import { randomUUID } from "node:crypto";
import { createInfrai } from "./infrai.ts";

const publicBaseUrl = process.env.PUBLIC_BASE_URL;
const signingSecret = process.env.PLATFORM_WEBHOOK_SECRET;
if (!publicBaseUrl || !signingSecret) {
  throw new Error("Set PUBLIC_BASE_URL and PLATFORM_WEBHOOK_SECRET before registration.");
}

const callbackUrl = new URL("/api/platform-events", publicBaseUrl).toString();
const queue = "platform-events";
const infrai = createInfrai();

const webhook = await infrai.account.webhooks.register({
  url: callbackUrl,
  events: ["build.completed", "release.promoted", "diagnostic.reported"],
  description: "Developer-tool platform event receiver",
  secret: signingSecret,
});

const subscription = await infrai.queue.push_subscribe(queue, {
  queue,
  url: callbackUrl,
  secret: signingSecret,
  visibility_timeout: 60,
  idempotency_key: randomUUID(),
});

console.log(JSON.stringify({ webhookId: webhook.id, subscriptionId: subscription.id, callbackUrl }, null, 2));
