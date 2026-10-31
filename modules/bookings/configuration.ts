import { z } from "zod";
import type { State } from "../clinic/types";
import { settingsSchema } from "./validation";
export const durationChanges = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]{1,80}$/),
      duration: z.number().int().min(5).max(240).nullable(),
    }),
  )
  .max(100)
  .refine(
    (v) => new Set(v.map((x) => x.id)).size === v.length,
    "Duplicate service IDs.",
  );
export function applyConfiguration(
  s: State,
  settings: unknown,
  changes?: unknown,
) {
  const parsed = settingsSchema.parse(settings);
  const durations = changes === undefined ? [] : durationChanges.parse(changes);
  for (const c of durations)
    if (!s.services.some((v) => v.id === c.id))
      throw new Error("Service not found. Refresh the settings page.");
  s.settings = parsed;
  for (const c of durations)
    s.services.find((v) => v.id === c.id)!.duration = c.duration;
}
