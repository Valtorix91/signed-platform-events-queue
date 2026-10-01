import { z } from "zod";

export const platformEventSchema = z.object({
  event_id: z.string().min(1),
  type: z.enum(["build.completed", "release.promoted", "diagnostic.reported"]),
  occurred_at: z.string().datetime(),
  project: z.string().min(1),
  payload: z.record(z.unknown()),
});

export type PlatformEvent = z.infer<typeof platformEventSchema>;

export function decideEvent(event: PlatformEvent): { status: number; message: string } {
  if (event.type === "build.completed") {
    return { status: 202, message: `Build event accepted for ${event.project}.` };
  }
  if (event.type === "release.promoted") {
    return { status: 202, message: `Release event accepted for ${event.project}.` };
  }
  return { status: 202, message: `Diagnostic recorded for ${event.project}.` };
}
