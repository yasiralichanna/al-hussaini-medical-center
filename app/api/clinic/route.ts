import {
  bookingReadiness,
  slotAvailability,
} from "../../../modules/bookings/readiness";
import { applyConfiguration } from "../../../modules/bookings/configuration";
import { canAdmin } from "../../../modules/auth/permissions";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { readState, mutate } from "../../../server/store";
import { assertOrigin, staffSession } from "../../../server/auth";
import { dispatchNotification } from "../../../server/notifications";
import { rateLimit } from "../../../server/rate-limit";
import {
  available,
  expire,
  localDate,
} from "../../../modules/bookings/availability";
import {
  reserve,
  managed,
  move,
  changeStatus,
  publicAppointment,
  audit,
} from "../../../modules/bookings/service";
import {
  bookingSchema,
  enquirySchema,
  settingsSchema,
  serviceSchema,
  date,
  time,
} from "../../../modules/bookings/validation";
import {
  token,
  hash,
  passwordHash,
  verifyPassword,
} from "../../../modules/auth/crypto";
export const dynamic = "force-dynamic";
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
export async function GET(req: Request) {
  try {
    const url = new URL(req.url),
      action = url.searchParams.get("action") || "public";
    if (action === "public") {
      const s = await readState();
      return response({
        settings: s.settings,
        services: s.services.filter((v) => v.active),
        today: localDate(),
        ...bookingReadiness(s),
        notificationStatus: process.env.NOTIFICATION_WEBHOOK_URL
          ? "Configured webhook"
          : "Not configured",
      });
    }
    if (action === "slots") {
      const service = z.string().max(80).parse(url.searchParams.get("service"));
      const d = date.parse(url.searchParams.get("date"));
      return response(slotAvailability(await readState(), service, d));
    }
    if (action === "session") {
      const u = await staffSession();
      return response({
        staff: u
          ? { id: u.id, name: u.name, email: u.email, role: u.role }
          : null,
      });
    }
    if (action === "dashboard") {
      const user = await staffSession();
      if (!user) return response({ error: "Please sign in." }, 401);
      return response(
        await mutate((s) => {
          expire(s);
          return {
            staff: { id: user.id, name: user.name, role: user.role },
            appointments: s.appointments.map(
              ({ tokenHash, idempotency, fingerprint, ...a }) => a,
            ),
            enquiries: s.enquiries,
            services: s.services,
            settings: user.role === "administrator" ? s.settings : undefined,
            team:
              user.role === "administrator"
                ? s.staff.map(({ passwordHash, ...u }) => u)
                : undefined,
            audit:
              user.role === "administrator"
                ? s.audit.slice(-200).reverse()
                : undefined,
            notifications: s.notifications,
            notificationConfigured:
              !!process.env.NOTIFICATION_WEBHOOK_URL &&
              !!process.env.NOTIFICATION_WEBHOOK_TOKEN,
            today: localDate(),
          };
        }),
      );
    }
    return response({ error: "Unknown action" }, 404);
  } catch (e: any) {
    return response(
      {
        error:
          e instanceof z.ZodError
            ? e.issues[0].message
            : "The clinic service is temporarily unavailable. Please call 0300-3032956.",
      },
      503,
    );
  }
}
export async function POST(req: Request) {
  try {
    assertOrigin(req);
    if (Number(req.headers.get("content-length") || 0) > 2300000)
      return response({ error: "Request too large" }, 413);
    const raw = await req.text();
    if (raw.length > 2300000)
      return response({ error: "Request too large" }, 413);
    const body = JSON.parse(raw);
    const action = z.string().max(40).parse(body.action);
    if (action === "login") {
      await rateLimit(req, "login", 8);
      const input = z
        .object({
          email: z.string().email().max(200),
          password: z.string().min(1).max(200),
        })
        .parse(body);
      const s = await readState();
      const u = s.staff.find(
        (v) => v.active && v.email === input.email.toLowerCase(),
      );
      if (!u || !(await verifyPassword(input.password, u.passwordHash)))
        return response({ error: "Invalid email or password." }, 401);
      const rawToken = token();
      const h = await hash(rawToken);
      await mutate((s) => {
        s.sessions = s.sessions.filter((v) => v.expires > Date.now());
        s.sessions.push({
          hash: h,
          staffId: u.id,
          expires: Date.now() + 8 * 3600000,
        });
        audit(s, u.id, "staff.login", u.id);
      });
      (await cookies()).set("clinic_session", rawToken, {
        httpOnly: true,
        secure: new URL(req.url).protocol === "https:",
        sameSite: "strict",
        path: "/",
        maxAge: 8 * 3600,
      });
      return response({ ok: true });
    }
    if (action === "logout") {
      const rawToken = (await cookies()).get("clinic_session")?.value;
      if (rawToken) {
        const h = await hash(rawToken);
        await mutate((s) => {
          s.sessions = s.sessions.filter((v) => v.hash !== h);
        });
      }
      (await cookies()).delete("clinic_session");
      return response({ ok: true });
    }
    if (action === "booking") {
      await rateLimit(req, "booking", 20);
      const input = bookingSchema.parse(body);
      const privateToken = z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(body.managementToken);
      const result = await mutate((s) => reserve(s, input, privateToken));
      return response({
        appointment: publicAppointment(result.appointment),
        replayed: result.replayed,
        managementToken: privateToken,
      });
    }
    if (action === "enquiry") {
      await rateLimit(req, "enquiry", 8);
      const input = enquirySchema.parse(body);
      const id = crypto.randomUUID();
      await mutate((s) => {
        s.enquiries.push({
          id,
          name: input.name,
          phone: input.phone,
          message: input.message,
          status: "new",
          createdAt: Date.now(),
        });
      });
      return response({ ok: true });
    }
    if (action === "manage") {
      await rateLimit(req, "manage", 60);
      const t = z.string().max(64).parse(body.token);
      return response(
        await mutate(async (s) => {
          expire(s);
          const a = await managed(s, t);
          if (body.operation === "slots")
            return {
              slots: available(
                s,
                a.service,
                date.parse(body.date),
                Date.now(),
                a.id,
                a.duration,
              ),
            };
          if (body.operation === "cancel") changeStatus(s, a, "cancelled");
          else if (body.operation === "reschedule")
            move(s, a, date.parse(body.date), time.parse(body.time));
          else if (body.operation !== "read")
            throw new Error("Invalid operation.");
          return {
            appointment: publicAppointment(a),
            settings: {
              cancellationHours: s.settings.cancellationHours,
              holdMinutes: s.settings.holdMinutes,
            },
          };
        }),
      );
    }
    // Bootstrap is possible only with a one-time secret installed by the operator.
    if (action === "setup") {
      await rateLimit(req, "setup", 5);
      const secret = process.env.ADMIN_SETUP_SECRET;
      if (
        !secret ||
        typeof body.secret !== "string" ||
        (await hash(secret)) !== (await hash(body.secret))
      )
        return response(
          { error: "Initial setup is unavailable or the key is invalid." },
          403,
        );
      const input = z
        .object({
          email: z.string().email().max(200),
          name: z.string().min(2).max(80),
          password: z.string().min(14).max(200),
        })
        .parse(body);
      const ph = await passwordHash(input.password);
      await mutate((s) => {
        if (s.staff.length)
          throw new Error("Initial administrator already exists.");
        const id = crypto.randomUUID();
        s.staff.push({
          id,
          name: input.name,
          email: input.email.toLowerCase(),
          role: "administrator",
          passwordHash: ph,
          active: true,
        });
        audit(s, id, "staff.bootstrap", id);
      });
      return response({ ok: true });
    }
    const user = await staffSession();
    if (!user) return response({ error: "Please sign in." }, 401);
    if (action === "status") {
      const status = z
        .enum([
          "pending",
          "confirmed",
          "declined",
          "cancelled",
          "completed",
          "no_show",
        ])
        .parse(body.status);
      await mutate((s) => {
        const a = s.appointments.find((v) => v.id === body.id);
        if (!a) throw new Error("Appointment not found.");
        changeStatus(s, a, status, user);
      });
      return response({ ok: true });
    }
    if (action === "reschedule") {
      await mutate((s) => {
        const a = s.appointments.find((v) => v.id === body.id);
        if (!a) throw new Error("Appointment not found.");
        move(s, a, date.parse(body.date), time.parse(body.time), user);
      });
      return response({ ok: true });
    }
    if (action === "internal-note") {
      const note = z.string().max(1000).parse(body.note);
      await mutate((s) => {
        const a = s.appointments.find((v) => v.id === body.id);
        if (!a) throw new Error("Appointment not found.");
        a.internalNote = note;
        a.updatedAt = Date.now();
        audit(s, user.id, "appointment.note", a.id);
      });
      return response({ ok: true });
    }
    if (action === "staff-booking") {
      const input = bookingSchema.parse(body);
      await mutate((s) => reserve(s, input, token(), Date.now(), user));
      return response({ ok: true });
    }
    if (action === "notification-retry") {
      const id = z.string().uuid().parse(body.id);
      return response(await dispatchNotification(id));
    }
    if (action === "resolve") {
      await mutate((s) => {
        const e = s.enquiries.find((v) => v.id === body.id);
        if (!e) throw new Error("Enquiry not found.");
        e.status = "resolved";
        audit(s, user.id, "enquiry.resolve", e.id);
      });
      return response({ ok: true });
    }
    if (!canAdmin(user))
      return response({ error: "Administrator access required." }, 403);
    if (action === "settings") {
      // Apply hours and duration changes in the same atomic commit.
      await mutate((s) => {
        applyConfiguration(s, body.settings, body.serviceDurations);
        audit(s, user.id, "settings.update", "clinic");
      });
      return response({ ok: true });
    }
    if (action === "service") {
      const service = serviceSchema.parse(body.service);
      await mutate((s) => {
        const i = s.services.findIndex((v) => v.id === service.id);
        if (i < 0) s.services.push(service);
        else s.services[i] = service;
        audit(s, user.id, "service.update", service.id);
      });
      return response({ ok: true });
    }
    if (action === "staff") {
      const input = z
        .object({
          email: z.string().email().max(200),
          name: z.string().min(2).max(80),
          password: z.string().min(14).max(200),
          role: z.enum(["administrator", "receptionist"]),
        })
        .parse(body);
      const ph = await passwordHash(input.password);
      await mutate((s) => {
        if (s.staff.some((v) => v.email === input.email.toLowerCase()))
          throw new Error("This staff account already exists.");
        const id = crypto.randomUUID();
        s.staff.push({
          id,
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash: ph,
          active: true,
          role: input.role,
        });
        audit(s, user.id, "staff.create", id);
      });
      return response({ ok: true });
    }
    if (action === "deactivate") {
      await mutate((s) => {
        if (body.id === user.id)
          throw new Error("You cannot deactivate your own account.");
        const u = s.staff.find((v) => v.id === body.id);
        if (!u) throw new Error("Staff account not found.");
        u.active = false;
        s.sessions = s.sessions.filter((v) => v.staffId !== u.id);
        audit(s, user.id, "staff.deactivate", u.id);
      });
      return response({ ok: true });
    }
    if (action === "retention") {
      const count = await mutate((s) => {
        const cutoff = Date.now() - s.settings.retentionDays * 86400000;
        const old = s.appointments.length;
        s.appointments = s.appointments.filter(
          (a) =>
            a.updatedAt >= cutoff ||
            ["pending", "confirmed"].includes(a.status),
        );
        s.enquiries = s.enquiries.filter(
          (e) => e.createdAt >= cutoff || e.status === "new",
        );
        const ids = new Set(s.appointments.map((a) => a.id));
        s.notifications = s.notifications.filter((n) =>
          ids.has(n.appointmentId),
        );
        s.sessions = s.sessions.filter((v) => v.expires > Date.now());
        s.audit = s.audit.filter((v) => v.at >= cutoff);
        audit(s, user.id, "retention.run", "clinic");
        return old - s.appointments.length;
      });
      return response({ ok: true, count });
    }
    return response({ error: "Unknown action." }, 404);
  } catch (e: any) {
    const message =
      e instanceof z.ZodError
        ? e.issues.map((v) => v.path.join(".") + ": " + v.message).join("; ")
        : e.message || "Unable to process this request.";
    return response({ error: message }, 400);
  }
}
