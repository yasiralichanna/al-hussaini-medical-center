import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../modules/clinic/types";
import { applyConfiguration } from "../modules/bookings/configuration";
import {
  bookingReadiness,
  slotAvailability,
} from "../modules/bookings/readiness";
import { reserve, changeStatus } from "../modules/bookings/service";
import { token } from "../modules/auth/crypto";
import { localDate } from "../modules/bookings/availability";
const now = Date.parse("2030-04-08T02:00:00Z"),
  date = "2030-04-08";
test("saved working days alone give an explicit missing-duration reason", () => {
  const s = initialState();
  s.settings.days = [0, 1, 2, 3, 4, 6];
  const r = slotAvailability(s, "ultrasound", date, now);
  assert.equal(r.configured, false);
  assert.equal(r.reason, "duration_missing");
  assert.equal(r.missingDurations.length, 5);
  assert.deepEqual(r.slots, []);
});
test("saving a duration alongside clinic settings immediately opens real slots", () => {
  const s = initialState();
  applyConfiguration(s, { ...s.settings, days: [0, 1, 2, 3, 4, 6] }, [
    { id: "ultrasound", duration: 20 },
  ]);
  const r = slotAvailability(s, "ultrasound", date, now);
  assert.equal(r.configured, true);
  assert.deepEqual(r.bookableServiceIds, ["ultrasound"]);
  assert.equal(r.reason, null);
  assert(r.slots.includes("09:00"));
  assert.equal(
    slotAvailability(s, "physiotherapy", date, now).reason,
    "duration_missing",
  );
});
test("duration edits preserve user-set hours and existing other service durations", () => {
  const s = initialState();
  s.services[1].duration = 45;
  const settings = {
    ...s.settings,
    days: [1, 2],
    sessions: [{ start: "10:00", end: "13:00" }],
  };
  applyConfiguration(s, settings, [{ id: "ultrasound", duration: 25 }]);
  assert.deepEqual(s.settings.sessions, settings.sessions);
  assert.equal(s.services[1].duration, 45);
  assert.equal(s.services[0].duration, 25);
});
test("invalid duration or missing service rejects without partially changing settings", () => {
  const s = initialState();
  const original = structuredClone(s);
  assert.throws(() =>
    applyConfiguration(s, { ...s.settings, days: [1] }, [
      { id: "ultrasound", duration: 0 },
    ]),
  );
  assert.deepEqual(s, original);
  assert.throws(() =>
    applyConfiguration(s, { ...s.settings, days: [1] }, [
      { id: "missing", duration: 30 },
    ]),
  );
  assert.deepEqual(s, original);
});
test("slot empty reasons distinguish closed day, blocked date and finished sessions", () => {
  const s = initialState();
  applyConfiguration(s, { ...s.settings, days: [1] }, [
    { id: "ultrasound", duration: 30 },
  ]);
  assert.equal(
    slotAvailability(s, "ultrasound", "2030-04-09", now).reason,
    "closed_day",
  );
  s.settings.blocked = [{ date }];
  assert.equal(
    slotAvailability(s, "ultrasound", date, now).reason,
    "blocked_day",
  );
  s.settings.blocked = [];
  assert.equal(
    slotAvailability(s, "ultrasound", date, Date.parse("2030-04-08T16:00:00Z"))
      .reason,
    "day_finished",
  );
});
test("staff-created booking saves as confirmed after selecting an available time", async () => {
  const s = initialState();
  applyConfiguration(s, { ...s.settings, days: [0, 1, 2, 3, 4, 5, 6] }, [
    { id: "ultrasound", duration: 30 },
  ]);
  const actor = {
    id: "qa-staff",
    email: "qa@development.invalid",
    name: "Synthetic QA",
    role: "administrator" as const,
    passwordHash: "",
    active: true,
  };
  const r = await reserve(
    s,
    {
      name: "Synthetic UI Test",
      phone: "03001234567",
      service: "ultrasound",
      date,
      time: "09:00",
      note: "Test only",
      consent: true,
      idempotency: crypto.randomUUID(),
    },
    token(),
    now,
    actor,
  );
  assert.equal(r.appointment.status, "confirmed");
  assert.equal(r.appointment.time, "09:00");
  assert.equal(s.appointments.length, 1);
});
test("Confirm transitions a valid future pending request to confirmed", async () => {
  const s = initialState();
  s.settings.days = [0, 1, 2, 3, 4, 5, 6];
  s.services[0].duration = 30;
  const date = localDate(Date.now() + 2 * 86400000);
  const { appointment } = await reserve(
    s,
    {
      name: "Synthetic QA",
      phone: "03001234567",
      service: "ultrasound",
      date,
      time: "09:00",
      note: "",
      consent: true,
      idempotency: crypto.randomUUID(),
    },
    token(),
  );
  changeStatus(s, appointment, "confirmed", {
    id: "qa-staff",
    email: "qa@development.invalid",
    name: "QA",
    role: "administrator",
    passwordHash: "",
    active: true,
  });
  assert.equal(appointment.status, "confirmed");
});
