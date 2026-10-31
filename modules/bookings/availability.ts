import type { State, Appointment, Status } from "../clinic/types";
export const minutes = (s: string) =>
  Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
export const localDate = (now = Date.now()) =>
  new Date(now + 5 * 3600000).toISOString().slice(0, 10);
export const instant = (date: string, time: string) =>
  Date.parse(`${date}T${time}:00+05:00`);
export function expire(s: State, now = Date.now()) {
  for (const a of s.appointments)
    if (a.status === "pending" && a.holdUntil <= now) {
      a.status = "cancelled";
      a.updatedAt = now;
    }
}
export function isActive(a: Appointment, now: number) {
  return (
    a.status === "confirmed" || (a.status === "pending" && a.holdUntil > now)
  );
}
export function available(
  s: State,
  serviceId: string,
  date: string,
  now = Date.now(),
  exclude?: string,
  durationOverride?: number,
) {
  const service = s.services.find((v) => v.id === serviceId && v.active);
  if (
    !service ||
    !(durationOverride ?? service.duration) ||
    !s.settings.days.length ||
    date < localDate(now) ||
    date > localDate(now + 90 * 86400000)
  )
    return [];
  if (!s.settings.days.includes(new Date(date + "T12:00:00+05:00").getUTCDay()))
    return [];
  const duration = durationOverride ?? service!.duration!;
  const slots: string[] = [];
  for (let m = 0; m < 1440; m += s.settings.interval) {
    const end = m + duration;
    const time =
      String(Math.floor(m / 60)).padStart(2, "0") +
      ":" +
      String(m % 60).padStart(2, "0");
    if (instant(date, time) <= now) continue;
    if (
      !s.settings.sessions.some(
        (v) => m >= minutes(v.start) && end <= minutes(v.end),
      )
    )
      continue;
    if (
      s.settings.blocked.some(
        (b) =>
          b.date === date &&
          (!b.start || (m < minutes(b.end!) && end > minutes(b.start))),
      )
    )
      continue;
    const overlapping = s.appointments.filter(
      (a) =>
        a.id !== exclude &&
        a.date === date &&
        isActive(a, now) &&
        minutes(a.time) < end &&
        minutes(a.time) + a.duration > m,
    );
    const events = [
      ...overlapping.map((a) => ({
        at: Math.max(m, minutes(a.time)),
        delta: 1,
      })),
      ...overlapping.map((a) => ({
        at: Math.min(end, minutes(a.time) + a.duration),
        delta: -1,
      })),
    ].sort((a, b) => a.at - b.at || a.delta - b.delta);
    let count = 0,
      full = false;
    for (const e of events) {
      count += e.delta;
      if (count >= s.settings.capacity) {
        full = true;
        break;
      }
    }
    if (!full) slots.push(time);
  }
  return slots;
}
export const transitions: Record<Status, Status[]> = {
  pending: ["confirmed", "declined", "cancelled"],
  confirmed: ["cancelled", "completed", "no_show"],
  declined: [],
  cancelled: [],
  completed: [],
  no_show: [],
};
