import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../modules/clinic/types";
import { resolveStaff, canAdmin } from "../modules/auth/permissions";
test("anonymous and invalid sessions cannot resolve staff", () => {
  assert.equal(resolveStaff(initialState(), "missing"), null);
});
test("receptionist cannot receive administrator permissions", () => {
  const s = initialState();
  s.staff.push({
    id: "r",
    role: "receptionist",
    active: true,
    email: "r@development.invalid",
    name: "Test",
    passwordHash: "",
  });
  s.sessions.push({ hash: "valid", staffId: "r", expires: Date.now() + 10000 });
  const u = resolveStaff(s, "valid");
  assert.equal(u?.role, "receptionist");
  assert.equal(canAdmin(u), false);
});
test("logout, expired sessions and deactivated staff lose access", () => {
  const s = initialState();
  s.staff.push({
    id: "a",
    role: "administrator",
    active: true,
    email: "a@development.invalid",
    name: "Test",
    passwordHash: "",
  });
  s.sessions.push({ hash: "valid", staffId: "a", expires: 200 });
  assert.equal(canAdmin(resolveStaff(s, "valid", 100)), true);
  assert.equal(resolveStaff(s, "valid", 201), null);
  s.staff[0].active = false;
  assert.equal(resolveStaff(s, "valid", 100), null);
  s.staff[0].active = true;
  s.sessions = [];
  assert.equal(resolveStaff(s, "valid", 100), null);
});
