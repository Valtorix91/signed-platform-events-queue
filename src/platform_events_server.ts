import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { decideEvent, platformEventSchema } from "./event_decision.ts";

const port = Number(process.env.PORT ?? 3000);
const signingSecret = process.env.PLATFORM_WEBHOOK_SECRET;
if (!signingSecret) throw new Error("Set PLATFORM_WEBHOOK_SECRET before starting the receiver.");

function signatureFor(rawBody: string): string {
  return createHmac("sha256", signingSecret).update(rawBody).digest("hex");
}

function signatureMatches(rawBody: string, received: string | undefined): boolean {
  if (!received) return false;
  const expected = Buffer.from(signatureFor(rawBody), "hex");
  const actual = Buffer.from(received, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/api/platform-events") {
    response.writeHead(404).end();
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const rawBody = Buffer.concat(chunks).toString("utf8");
  const signature = request.headers["x-infrai-signature"];
  const received = Array.isArray(signature) ? signature[0] : signature;
  if (!signatureMatches(rawBody, received)) {
    response.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ accepted: false }));
    return;
  }

  const parsed = platformEventSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ accepted: false }));
    return;
  }
  const decision = decideEvent(parsed.data);
  response.writeHead(decision.status, { "content-type": "application/json" }).end(JSON.stringify(decision));
}).listen(port, () => console.log(`Platform event receiver listening on ${port}`));
