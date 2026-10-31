import type { State, Appointment, Staff, Status } from "../clinic/types";
import { available, expire, instant, transitions } from "./availability";
import { bookingSchema } from "./validation";
import { hash, constantEqual } from "../auth/crypto";
export function audit(s: State, actor: string, action: string, target: string) {
  s.audit.push({
    id: crypto.randomUUID(),
    actor,
    action,
    target,
    at: Date.now(),
  });
}
export async function reserve(
  s: State,
  input: unknown,
  rawToken: string,
  now = Date.now(),
  actor?: Staff,
) {
  const data = bookingSchema.parse(input);
  const fingerprint = await hash(JSON.stringify({ ...data, idempotency: "" }));
  expire(s, now);
  const previous = s.appointments.find(
    (a) => a.idempotency === data.idempotency,
  );
  if (previous) {
    if (
      previous.tokenHash !== (await hash(rawToken)) ||
      previous.fingerprint !== fingerprint
    )
      throw new Error(
        "This request key was already used. Start a new request.",
      );
    return { appointment: previous, replayed: true };
  }
  if (!available(s, data.service, data.date, now).includes(data.time))
    throw new Error(
      "This time is no longer available. Please choose another time.",
    );
  const id = crypto.randomUUID();
  const appointment: Appointment = {
    ...data,
    id,
    reference: "AH-" + id.replaceAll("-", "").slice(0, 10).toUpperCase(),
    tokenHash: await hash(rawToken),
    fingerprint,
    duration: s.services.find((v) => v.id === data.service)!.duration!,
    status: actor ? "confirmed" : "pending",
    internalNote: "",
    createdAt: now,
    updatedAt: now,
    holdUntil: now + s.settings.holdMinutes * 60000,
  };
  s.appointments.push(appointment);
  s.notifications.push({
    id: crypto.randomUUID(),
    appointmentId: id,
    status: "not_configured",
    attempts: 0,
    updatedAt: now,
  });
  audit(s, actor?.id ?? "patient", "appointment.create", id);
  return { appointment, replayed: false };
}
export async function managed(s: State, raw: string) {
  if (!/^[a-f0-9]{64}$/.test(raw))
    throw new Error("Invalid or expired management link.");
  const h = await hash(raw);
  const a = s.appointments.find((v) => constantEqual(v.tokenHash, h));
  if (!a) throw new Error("Invalid or expired management link.");
  return a;
}
export function move(
  s: State,
  a: Appointment,
  date: string,
  time: string,
  actor?: Staff,
) {
  expire(s);
  if (!["pending", "confirmed"].includes(a.status))
    throw new Error("This appointment can no longer be changed.");
  if (
    !actor &&
    instant(a.date, a.time) - Date.now() <
      s.settings.cancellationHours * 3600000
  )
    throw new Error("The change window has closed. Please call the clinic.");
  if (
    !available(s, a.service, date, Date.now(), a.id, a.duration).includes(time)
  )
    throw new Error("This time is unavailable.");
  a.date = date;
  a.time = time;
  a.updatedAt = Date.now();
  if (!actor) {
    a.status = "pending";
    a.holdUntil = Date.now() + s.settings.holdMinutes * 60000;
  }
  audit(s, actor?.id ?? "patient", "appointment.reschedule", a.id);
}
export function changeStatus(
  s: State,
  a: Appointment,
  status: Status,
  actor?: Staff,
) {
  expire(s);
  if (!actor) {
    if (status !== "cancelled" || !["pending", "confirmed"].includes(a.status))
      throw new Error("This appointment can no longer be cancelled.");
    if (
      instant(a.date, a.time) - Date.now() <
      s.settings.cancellationHours * 3600000
    )
      throw new Error(
        "The cancellation window has closed. Please call the clinic.",
      );
  }
  if (!transitions[a.status].includes(status))
    throw new Error("Invalid appointment status change.");
  if (
    status === "confirmed" &&
    !available(s, a.service, a.date, Date.now(), a.id, a.duration).includes(
      a.time,
    )
  )
    throw new Error("Capacity or availability changed. Reschedule first.");
  if (
    ["completed", "no_show"].includes(status) &&
    instant(a.date, a.time) > Date.now()
  )
    throw new Error(
      "Future appointments cannot be marked completed or no-show.",
    );
  a.status = status;
  a.updatedAt = Date.now();
  audit(s, actor?.id ?? "patient", "appointment." + status, a.id);
}
export function publicAppointment(a: Appointment) {
  const {
    id,
    reference,
    name,
    phone,
    service,
    date,
    time,
    status,
    note,
    holdUntil,
  } = a;
  return {
    id,
    reference,
    name,
    phone,
    service,
    date,
    time,
    status,
    note,
    holdUntil,
  };
}
