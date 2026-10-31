import { env } from "cloudflare:workers";
import type { State } from "../../modules/clinic/types";
function db() {
  return (env as unknown as { DB: D1Database }).DB;
}
export async function readRecord() {
  const row = await db()
    .prepare("SELECT revision, data FROM clinic_state WHERE id = ?")
    .bind("clinic")
    .first<{ revision: number; data: string }>();
  return row
    ? { revision: row.revision, state: JSON.parse(row.data) as State }
    : null;
}
export async function compareAndSwap(revision: number | null, state: State) {
  if (new TextEncoder().encode(JSON.stringify(state)).length > 1_500_000)
    throw new Error(
      "Hosted storage threshold reached. Apply retention or migrate to the MongoDB deployment.",
    );
  const result =
    revision === null
      ? await db()
          .prepare(
            "INSERT OR IGNORE INTO clinic_state (id,revision,data) VALUES (?,1,?)",
          )
          .bind("clinic", JSON.stringify(state))
          .run()
      : await db()
          .prepare(
            "UPDATE clinic_state SET revision=revision+1,data=? WHERE id=? AND revision=?",
          )
          .bind(JSON.stringify(state), "clinic", revision)
          .run();
  return result.meta.changes === 1;
}
