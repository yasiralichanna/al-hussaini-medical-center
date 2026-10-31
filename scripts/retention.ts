import { mutate } from "../server/store";
if (process.env.APPLY_RETENTION !== "yes")
  throw new Error(
    "Review backups and retention policy first, then set APPLY_RETENTION=yes.",
  );
const count = await mutate((s) => {
  const cutoff = Date.now() - s.settings.retentionDays * 86400000;
  const before = s.appointments.length;
  s.appointments = s.appointments.filter(
    (a) => a.updatedAt >= cutoff || ["pending", "confirmed"].includes(a.status),
  );
  s.enquiries = s.enquiries.filter(
    (e) => e.createdAt >= cutoff || e.status === "new",
  );
  const ids = new Set(s.appointments.map((a) => a.id));
  s.notifications = s.notifications.filter((n) => ids.has(n.appointmentId));
  s.sessions = s.sessions.filter((v) => v.expires > Date.now());
  s.audit = s.audit.filter((v) => v.at >= cutoff);
  s.audit.push({
    id: crypto.randomUUID(),
    actor: "retention-command",
    action: "retention.run",
    target: "clinic",
    at: Date.now(),
  });
  return before - s.appointments.length;
});
console.log(`Removed ${count} eligible inactive appointments.`);
process.exit(0);
