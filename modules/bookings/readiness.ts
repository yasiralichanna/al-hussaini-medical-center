import type { State } from "../clinic/types";
import { available, localDate, instant } from "./availability";
export function bookingReadiness(s: Pick<State, "settings" | "services">) {
  const active = s.services.filter((v) => v.active);
  return {
    configured: s.settings.days.length > 0 && active.some((v) => !!v.duration),
    hasWorkingDays: s.settings.days.length > 0,
    bookableServiceIds: active.filter((v) => v.duration).map((v) => v.id),
    missingDurations: active
      .filter((v) => !v.duration)
      .map((v) => ({ id: v.id, name: v.name })),
  };
}
export function slotAvailability(
  s: State,
  serviceId: string,
  date: string,
  now = Date.now(),
) {
  const service = s.services.find((v) => v.id === serviceId && v.active);
  const slots = available(s, serviceId, date, now);
  let reason: string | null = null;
  if (!service) reason = "service_unavailable";
  else if (!service.duration) reason = "duration_missing";
  else if (!s.settings.days.length) reason = "days_missing";
  else if (date < localDate(now)) reason = "past_date";
  else if (date > localDate(now + 90 * 86400000)) reason = "too_far";
  else if (
    !s.settings.days.includes(new Date(date + "T12:00:00+05:00").getUTCDay())
  )
    reason = "closed_day";
  else if (s.settings.blocked.some((b) => b.date === date && !b.start))
    reason = "blocked_day";
  else if (!slots.length)
    reason = s.settings.sessions.every((v) => instant(date, v.end) <= now)
      ? "day_finished"
      : "no_capacity";
  return { slots, reason, ...bookingReadiness(s) };
}
export const availabilityMessages: Record<string, string> = {
  service_unavailable:
    "This service is not currently available for online booking.",
  duration_missing:
    "Set an appointment duration for this service in Clinic settings → Appointment durations, then save settings.",
  days_missing: "Select operating days in Clinic settings and save settings.",
  past_date: "Choose today or a future date.",
  too_far: "Choose a date within the next 90 days.",
  closed_day: "The clinic is closed on this day. Choose another date.",
  blocked_day: "This date is blocked for appointments. Choose another date.",
  day_finished:
    "All opening sessions on this date have ended. Choose another date.",
  no_capacity:
    "No times are available on this date. They may be full or blocked; choose another date.",
};
