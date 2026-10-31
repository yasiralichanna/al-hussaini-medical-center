import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, type State } from "../modules/clinic/types";
import { available, expire, localDate } from "../modules/bookings/availability";
import {
  reserve,
  managed,
  move,
  changeStatus,
  publicAppointment,
} from "../modules/bookings/service";
import {
  normalizePhone,
  bookingSchema,
  settingsSchema,
} from "../modules/bookings/validation";
import {
  token,
  hash,
  passwordHash,
  verifyPassword,
} from "../modules/auth/crypto";
import { atomic, type StoreAdapter } from "../server/atomic";
const now = Date.parse("2030-04-08T02:00:00Z"),
  date = "2030-04-08";
function fixture() {
  const s = initialState();
  s.settings.days = [0, 1, 2, 3, 4, 5, 6];
  s.services.forEach((v) => (v.duration = 30));
  return s;
}
function input(time = "09:00") {
  return {
    name: "Development Test Patient",
    phone: "03001234567",
    service: "ultrasound",
    date,
    time,
    note: "Synthetic test only",
    consent: true,
    idempotency: crypto.randomUUID(),
  };
}
test("booking remains closed without verified working days and durations", () => {
  assert.deepEqual(available(initialState(), "ultrasound", date, now), []);
  const s = fixture();
  s.settings.days = [];
  assert.deepEqual(available(s, "ultrasound", date, now), []);
});
test("Pakistan mobiles normalize; malformed and foreign numbers reject", () => {
  for (const value of [
    "03001234567",
    "+923001234567",
    "923001234567",
    "0300 1234567",
  ])
    assert.equal(normalizePhone(value), "+923001234567");
  for (const value of ["123", "+12025550100", "030012345678"])
    assert.throws(() => normalizePhone(value));
});
test("server schema rejects invalid data, missing consent, impossible dates", () => {
  assert.equal(
    bookingSchema.safeParse({ ...input(), consent: false }).success,
    false,
  );
  assert.equal(
    bookingSchema.safeParse({ ...input(), date: "2030-02-30" }).success,
    false,
  );
  assert.equal(
    bookingSchema.safeParse({ ...input(), note: "x".repeat(501) }).success,
    false,
  );
});
test("past times, lunch closure, holidays and periods are excluded", () => {
  const s = fixture();
  assert.deepEqual(available(s, "ultrasound", "2020-01-01", now), []);
  let slots = available(s, "ultrasound", date, now);
  assert(slots.includes("09:00"));
  assert(!slots.includes("12:00"));
  assert(!slots.includes("19:45"));
  s.settings.blocked = [{ date, start: "09:00", end: "10:00" }];
  slots = available(s, "ultrasound", date, now);
  assert(!slots.includes("09:30"));
  assert(slots.includes("10:00"));
  s.settings.blocked = [{ date }];
  assert.deepEqual(available(s, "ultrasound", date, now), []);
});
test("valid request saves as pending; token hash only is stored", async () => {
  const s = fixture(),
    raw = token();
  const r = await reserve(s, input(), raw, now);
  assert.equal(r.appointment.status, "pending");
  assert.equal(s.appointments.length, 1);
  assert.equal(r.appointment.phone, "+923001234567");
  assert.equal(r.appointment.tokenHash, await hash(raw));
  assert.equal("tokenHash" in publicAppointment(r.appointment), false);
  assert.equal("internalNote" in publicAppointment(r.appointment), false);
  assert.equal((await managed(s, raw)).id, r.appointment.id);
  await assert.rejects(() => managed(s, r.appointment.reference));
});
test("idempotent retries return same record and reject altered input or token", async () => {
  const s = fixture(),
    i = input(),
    raw = token();
  const r = await reserve(s, i, raw, now);
  const retry = await reserve(s, i, raw, now);
  assert.equal(retry.appointment.id, r.appointment.id);
  assert(retry.replayed);
  assert.equal(s.appointments.length, 1);
  await assert.rejects(() => reserve(s, { ...i, name: "Changed" }, raw, now));
  await assert.rejects(() => reserve(s, i, token(), now));
});
test("overlapping appointments share clinic capacity across services", async () => {
  const s = fixture();
  await reserve(s, input(), token(), now);
  assert(!available(s, "physiotherapy", date, now).includes("09:15"));
  assert(available(s, "physiotherapy", date, now).includes("09:30"));
  await assert.rejects(() => reserve(s, input("09:15"), token(), now));
  s.settings.capacity = 2;
  assert(available(s, "physiotherapy", date, now).includes("09:15"));
});
test("capacity uses peak simultaneous occupancy, not total overlap count", async () => {
  const s = fixture();
  s.settings.capacity = 2;
  s.services[0].duration = 15;
  await reserve(s, input("09:00"), token(), now);
  await reserve(s, input("09:15"), token(), now);
  assert(available(s, "physiotherapy", date, now).includes("09:00"));
});
test("expiry releases capacity and cannot turn expired request into confirmation", async () => {
  const s = fixture();
  s.settings.holdMinutes = 5;
  const { appointment: a } = await reserve(s, input(), token(), now);
  expire(s, a.holdUntil + 1);
  assert.equal(a.status, "cancelled");
  assert(available(s, "ultrasound", date, a.holdUntil + 1).includes("09:00"));
  assert.throws(() => changeStatus(s, a, "confirmed"));
});
test("reschedule validates availability and cancellation releases capacity", async () => {
  const s = fixture();
  const future = new Date(Date.now() + 86400000 * 2 + 5 * 3600000)
    .toISOString()
    .slice(0, 10);
  const i = { ...input(), date: future };
  const { appointment: a } = await reserve(s, i, token());
  const { appointment: b } = await reserve(
    s,
    { ...input("10:00"), date: future },
    token(),
  );
  assert.throws(() => move(s, a, future, "10:00"));
  move(s, a, future, "11:00");
  assert.equal(a.time, "11:00");
  assert.equal(a.status, "pending");
  changeStatus(s, a, "cancelled");
  assert(available(s, "ultrasound", future).includes("11:00"));
  assert.throws(() => changeStatus(s, a, "confirmed"));
  assert.equal(b.status, "pending");
});
test("100 competing requests cannot exceed configured capacity", async () => {
  let row: { revision: number; state: State } | null = {
    revision: 1,
    state: fixture(),
  };
  const adapter: StoreAdapter = {
    read: async () => {
      await new Promise((r) => setTimeout(r, Math.random() * 4));
      return structuredClone(row);
    },
    cas: async (revision, state) => {
      await new Promise((r) => setTimeout(r, Math.random() * 4));
      if (revision !== row?.revision) return false;
      row = { revision: (revision ?? 0) + 1, state: structuredClone(state) };
      return true;
    },
  };
  const results = await Promise.allSettled(
    Array.from({ length: 100 }, () =>
      atomic(adapter, (s) => reserve(s, input(), token(), now)),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(row!.state.appointments.length, 1);
});
test("concurrent identical retries save exactly once", async () => {
  let row = { revision: 1, state: fixture() };
  const adapter: StoreAdapter = {
    read: async () => structuredClone(row),
    cas: async (revision, state) => {
      if (row.revision !== revision) return false;
      row = { revision: revision! + 1, state };
      return true;
    },
  };
  const i = input(),
    raw = token();
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      atomic(adapter, (s) => reserve(s, i, raw, now)),
    ),
  );
  assert.equal(new Set(results.map((r) => r.appointment.id)).size, 1);
  assert.equal(row.state.appointments.length, 1);
});
test("long salted passwords verify correctly; incorrect passwords fail", async () => {
  const h = await passwordHash("A long synthetic password for testing");
  assert(!h.includes("synthetic"));
  assert(await verifyPassword("A long synthetic password for testing", h));
  assert(!(await verifyPassword("wrong", h)));
});
test("invalid capacity and unsafe photograph formats reject server-side", () => {
  const s = fixture().settings;
  assert(!settingsSchema.safeParse({ ...s, capacity: 0 }).success);
  assert(
    !settingsSchema.safeParse({
      ...s,
      photos: [
        {
          id: crypto.randomUUID(),
          alt: "Invalid image",
          data: "data:image/svg+xml;base64,PHN2Zz4=",
        },
      ],
    }).success,
  );
});
test("Asia/Karachi date boundary", () => {
  assert.equal(localDate(Date.parse("2030-04-07T20:00:00Z")), "2030-04-08");
});
test("saved duration remains authoritative after a service duration changes", async () => {
  const s = fixture();
  const raw = token();
  const { appointment: a } = await reserve(s, input(), raw, now);
  s.services[0].duration = 15;
  assert(available(s, "ultrasound", date, now, a.id).includes("11:45"));
  assert(
    !available(s, "ultrasound", date, now, a.id, a.duration).includes("11:45"),
  );
});
