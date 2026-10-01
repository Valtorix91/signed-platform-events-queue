import assert from "node:assert/strict";
import test from "node:test";
import { decideEvent, platformEventSchema } from "../src/event_decision.ts";

test("a release promotion is accepted for the receiving project", () => {
  const event = platformEventSchema.parse({
    event_id: "evt_release_42",
    type: "release.promoted",
    occurred_at: "2026-09-15T08:30:00.000Z",
    project: "docs-web",
    payload: { release: "2026.09.15" },
  });

  assert.deepEqual(decideEvent(event), {
    status: 202,
    message: "Release event accepted for docs-web.",
  });
});
