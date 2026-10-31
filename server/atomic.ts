import { initialState, type State } from "../modules/clinic/types";
export type StoreAdapter = {
  read: () => Promise<{ revision: number; state: State } | null>;
  cas: (revision: number | null, state: State) => Promise<boolean>;
};
/** One compare-and-swap contains availability validation, holds, and record changes. */
export async function atomic<T>(
  adapter: StoreAdapter,
  fn: (state: State) => T | Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 64; attempt++) {
    const row = await adapter.read();
    const state = row ? structuredClone(row.state) : initialState();
    const result = await fn(state);
    if (new TextEncoder().encode(JSON.stringify(state)).length > 10_000_000)
      throw new Error(
        "Storage threshold reached. Staff must apply retention procedures.",
      );
    if (await adapter.cas(row?.revision ?? null, state)) return result;
    await new Promise((r) =>
      setTimeout(r, Math.random() * Math.min(80, attempt * 5)),
    );
  }
  throw new Error("Clinic is busy. Please retry your request.");
}
