import type { State, Staff } from "../clinic/types";
export function resolveStaff(
  state: State,
  sessionHash: string,
  now = Date.now(),
) {
  const session = state.sessions.find(
    (v) => v.hash === sessionHash && v.expires > now,
  );
  return session
    ? (state.staff.find((v) => v.id === session.staffId && v.active) ?? null)
    : null;
}
export function canAdmin(staff: Staff | null) {
  return staff?.active === true && staff.role === "administrator";
}
