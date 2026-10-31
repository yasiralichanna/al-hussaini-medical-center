import { initialState, type State } from "../modules/clinic/types";
import { readRecord, compareAndSwap } from "./adapters/active";
import { atomic } from "./atomic";
export async function readState() {
  return (await readRecord())?.state ?? initialState();
}
export const mutate = <T>(fn: (state: State) => T | Promise<T>) =>
  atomic({ read: readRecord, cas: compareAndSwap }, fn);
