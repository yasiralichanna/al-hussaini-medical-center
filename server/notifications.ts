import { mutate } from "./store";
export async function dispatchNotification(id: string) {
  const provider = process.env.NOTIFICATION_WEBHOOK_URL;
  const credential = process.env.NOTIFICATION_WEBHOOK_TOKEN;
  const task = await mutate((s) => {
    const n = s.notifications.find((v) => v.id === id);
    if (!n) throw new Error("Notification not found.");
    if (n.status === "provider_accepted" || n.status === "delivered")
      return null;
    if (!provider || !credential) {
      n.status = "not_configured";
      n.lastError = "No messaging provider configured.";
      return null;
    }
    if (!provider.startsWith("https://"))
      throw new Error("Notification webhook must use HTTPS.");
    if (n.leaseUntil && n.leaseUntil > Date.now())
      throw new Error("A notification attempt is in progress.");
    const a = s.appointments.find((v) => v.id === n.appointmentId);
    if (!a) throw new Error("Appointment not found.");
    n.leaseUntil = Date.now() + 60000;
    n.status = "sending";
    n.attempts++;
    n.updatedAt = Date.now();
    return {
      id: n.id,
      payload: {
        event: "appointment.requested",
        phone: a.phone,
        reference: a.reference,
        date: a.date,
        time: a.time,
        timezone: "Asia/Karachi",
        status: a.status,
      },
    };
  });
  if (!task)
    return { ok: true, status: provider ? "unchanged" : "not_configured" };
  let result = "failed",
    error = "";
  try {
    const r = await fetch(provider!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + credential,
        "Idempotency-Key": id,
      },
      body: JSON.stringify(task.payload),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!r.ok) throw new Error("Provider HTTP " + r.status);
    result = "provider_accepted";
  } catch (e) {
    error = e instanceof Error ? e.message : "Provider request failed.";
  }
  await mutate((s) => {
    const n = s.notifications.find((v) => v.id === id);
    if (n) {
      n.status = result;
      n.lastError = error;
      n.leaseUntil = 0;
      n.updatedAt = Date.now();
    }
  });
  return { ok: result === "provider_accepted", status: result };
}
