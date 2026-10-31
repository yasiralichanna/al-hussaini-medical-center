"use client";
import { useAvailability } from "../bookings/useAvailability";
import { bookingReadiness } from "../bookings/readiness";
import { uuid } from "../clinic/uuid";
import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  Users,
  Settings as SettingsIcon,
  LogOut,
  ArrowUpRight,
  Mail,
  ShieldCheck,
  Clock,
  Plus,
  Search,
  Check,
  RefreshCw,
  X,
  FileText,
  Home,
  ClipboardList,
} from "lucide-react";
import { api } from "../clinic/api";
import type {
  Appointment,
  Service,
  Settings,
  Staff,
  Status,
} from "../clinic/types";
import { transitions, localDate } from "../bookings/availability";
const statuses: Status[] = [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
  "completed",
  "no_show",
];
function Brand() {
  return (
    <a href="/" className="brand">
      <span className="brand-symbol">
        <Plus />
      </span>
      <span>
        <strong>Al-Hussaini</strong>
        <small>CLINIC ADMINISTRATION</small>
      </span>
    </a>
  );
}
function Login({ onLogin }: { onLogin: () => void }) {
  const [setup, setSetup] = useState(false),
    [secret, setSecret] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.has("setup")) {
      setSetup(true);
      setSecret(p.get("setup") || "");
      history.replaceState(null, "", "/admin");
    }
  }, []);
  return (
    <div className="login-page">
      <Brand />
      <div className="login-card">
        <span className="eyebrow">AUTHORIZED CLINIC STAFF</span>
        <h1>{setup ? "Set up your clinic" : "Welcome back."}</h1>
        <p>
          {setup
            ? "Create the first administrator. This setup works only once, using the private operator key."
            : "Sign in to manage appointments and enquiries."}
        </p>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              if (setup) {
                await api("setup", {
                  email: f.get("email"),
                  name: f.get("name"),
                  password: f.get("password"),
                  secret: f.get("secret"),
                });
                setSetup(false);
                setError(
                  "Administrator created. Sign in using your new details.",
                );
              } else {
                await api("login", {
                  email: f.get("email"),
                  password: f.get("password"),
                });
                onLogin();
              }
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {setup && (
            <>
              <label>
                Private setup key
                <input
                  type="password"
                  name="secret"
                  required
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label>
                Your name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
            </>
          )}
          <label>
            Staff email
            <input
              type="email"
              name="email"
              required
              autoComplete="username"
              maxLength={200}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              required
              minLength={setup ? 14 : 1}
              maxLength={200}
              autoComplete={setup ? "new-password" : "current-password"}
            />
            {setup && (
              <small>Use at least 14 characters and a unique password.</small>
            )}
          </label>
          <button className="button primary full" disabled={busy}>
            {busy ? "Please wait…" : setup ? "Create administrator" : "Sign in"}
            <ArrowUpRight size={16} />
          </button>
        </form>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          className="text-link"
          onClick={() => {
            setSetup(!setup);
            setError("");
          }}
        >
          {setup ? "Back to sign in" : "Initial administrator setup"}
        </button>
        <br />
        <a className="text-link" href="/">
          ← Return to website
        </a>
      </div>
      <small>Secure staff access · Patient details are confidential.</small>
    </div>
  );
}
function Field({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      {title}
      {children}
    </label>
  );
}
export function StaffBooking({
  services,
  done,
  onClose,
}: {
  services: Service[];
  done: () => void;
  onClose: () => void;
}) {
  const [service, setService] = useState(
      services.find((s) => s.active)?.id || "",
    ),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [idempotency] = useState(uuid());
  const availability = useAvailability(
    service,
    date,
    services.find((v) => v.id === service)?.duration ?? "",
  );
  useEffect(() => setTime(""), [service, date]);
  useEffect(() => {
    if (time && !availability.slots.includes(time)) setTime("");
  }, [availability.slots]);
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Phone or walk-in booking"
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h2>Phone or walk-in booking</h2>
        <p className="form-notice">
          This creates a confirmed appointment using configured availability.
          Record the patient’s consent to appointment-related contact.
        </p>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              await api("staff-booking", {
                name: f.get("name"),
                phone: f.get("phone"),
                note: f.get("note") || "",
                service,
                date,
                time,
                consent: true,
                idempotency,
              });
              done();
              onClose();
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <Field title="Patient name">
              <input required name="name" minLength={2} maxLength={100} />
            </Field>
            <Field title="Mobile number">
              <input required type="tel" name="phone" maxLength={30} />
            </Field>
          </div>
          <Field title="Service">
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              {services
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field title="Date (Asia/Karachi)">
              <input
                type="date"
                min={localDate()}
                required
                value={date}
                onInput={(e) => setDate(e.currentTarget.value)}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field title="Available time">
              <select
                name="time"
                required
                value={time}
                disabled={availability.loading || !availability.slots.length}
                onChange={(e) => setTime(e.target.value)}
                onInput={(e) => setTime(e.currentTarget.value)}
              >
                <option value="">
                  {availability.loading
                    ? "Loading available times…"
                    : "Select time"}
                </option>
                {availability.slots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {date &&
            !availability.loading &&
            !availability.slots.length &&
            !availability.error && (
              <p className="form-notice" role="status">
                {availability.message ||
                  "No available times. Choose another date."}
              </p>
            )}
          {availability.error && (
            <div className="error" role="alert">
              {availability.error}
              <button
                type="button"
                className="text-link"
                onClick={availability.retry}
              >
                Retry loading times
              </button>
            </div>
          )}
          {!date && (
            <p className="form-help">
              Select a service and date to load available appointment times.
            </p>
          )}
          <Field title="Brief note">
            <textarea name="note" maxLength={500} />
            <small>No sensitive medical records.</small>
          </Field>
          <label className="check-label">
            <input required type="checkbox" />
            Patient agreed to appointment-related contact.
          </label>
          <button
            className="button primary full"
            disabled={busy || availability.loading || !time}
          >
            {busy ? "Saving…" : "Create confirmed appointment"}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
function AppointmentDetails({
  appointment,
  services,
  action,
  onClose,
}: {
  appointment: Appointment;
  services: Service[];
  action: (name: string, data: any) => Promise<boolean>;
  onClose: () => void;
}) {
  const [a, setA] = useState(appointment),
    [date, setDate] = useState(a.date),
    [time, setTime] = useState(a.time),
    [note, setNote] = useState(a.internalNote),
    [busy, setBusy] = useState(false);
  const run = async (name: string, data: any) => {
    setBusy(true);
    const ok = await action(name, data);
    setBusy(false);
    return ok;
  };
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Appointment details"
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <span className="eyebrow">{a.reference}</span>
        <h2>{a.name}</h2>
        <div className="review">
          <dl>
            <div>
              <dt>Contact</dt>
              <dd>
                <a href={"tel:" + a.phone}>{a.phone}</a>
              </dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{services.find((s) => s.id === a.service)?.name}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {a.date} · {a.time} (PKT)
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={"status " + a.status}>
                  {a.status.replace("_", " ")}
                </span>
              </dd>
            </div>
          </dl>
        </div>
        {a.note && <div className="form-notice">Patient note: {a.note}</div>}
        <div className="button-row">
          {transitions[a.status].map((status) => (
            <button
              key={status}
              className={
                "button " + (status === "confirmed" ? "primary" : "secondary")
              }
              disabled={busy}
              onClick={async () => {
                if (await run("status", { id: a.id, status }))
                  setA({ ...a, status });
              }}
            >
              {status === "confirmed"
                ? "Confirm"
                : status === "declined"
                  ? "Decline"
                  : status === "cancelled"
                    ? "Cancel"
                    : status === "completed"
                      ? "Complete"
                      : "Mark no-show"}
            </button>
          ))}
        </div>
        {["pending", "confirmed"].includes(a.status) && (
          <form
            className="admin-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run("reschedule", { id: a.id, date, time }))
                setA({ ...a, date, time });
            }}
          >
            <h3>Reschedule</h3>
            <p className="form-help">
              The server rechecks working days, closures, duration and capacity.
            </p>
            <div className="form-grid">
              <Field title="New date">
                <input
                  required
                  type="date"
                  min={localDate()}
                  value={date}
                  onInput={(e) => setDate(e.currentTarget.value)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field title="New time (Asia/Karachi)">
                <input
                  required
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </Field>
            </div>
            <button className="button secondary" disabled={busy}>
              Reschedule appointment
            </button>
          </form>
        )}
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await run("internal-note", { id: a.id, note });
          }}
        >
          <h3>Restricted internal note</h3>
          <Field title="Staff only — scheduling notes">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
            />
            <small>
              Avoid medical history. Never shown through patient management
              links.
            </small>
          </Field>
          <button className="button secondary" disabled={busy}>
            Save internal note
          </button>
        </form>
      </div>
    </div>
  );
}
function SettingsForm({
  settings,
  services,
  action,
}: {
  settings: Settings;
  services: Service[];
  action: (name: string, data: any) => Promise<boolean>;
}) {
  const [s, setS] = useState(settings),
    [durations, setDurations] = useState(() =>
      services.map((v) => ({ id: v.id, duration: v.duration })),
    ),
    [blockDate, setBlockDate] = useState(""),
    [blockStart, setBlockStart] = useState(""),
    [blockEnd, setBlockEnd] = useState(""),
    [busy, setBusy] = useState(false),
    [photoError, setPhotoError] = useState("");
  const update = (k: keyof Settings, v: any) => setS({ ...s, [k]: v });
  return (
    <form
      className="admin-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await action("settings", { settings: s, serviceDurations: durations });
        setBusy(false);
      }}
    >
      <div className="info-banner">
        Online booking stays closed until you select operating days and set a
        duration for each bookable service. The supplied evening closing time of
        8 PM is provisional: confirm 7 PM versus 8 PM before launch.
      </div>
      <div className="admin-card">
        <h2>Appointment durations</h2>
        <p className="admin-description">
          Operating hours alone do not enable booking. Enter the clinic-approved
          duration for each service that should accept appointments. Blank
          durations keep that service closed.
        </p>
        <div className="form-grid">
          {services
            .filter((v) => v.active)
            .map((service) => (
              <Field key={service.id} title={service.name + " · minutes"}>
                <input
                  type="number"
                  min={5}
                  max={240}
                  step={1}
                  value={
                    durations.find((v) => v.id === service.id)?.duration ?? ""
                  }
                  placeholder="Not configured"
                  onChange={(e) =>
                    setDurations((values) =>
                      values.map((v) =>
                        v.id === service.id
                          ? {
                              ...v,
                              duration: e.target.value
                                ? Number(e.target.value)
                                : null,
                            }
                          : v,
                      ),
                    )
                  }
                />
              </Field>
            ))}
        </div>
        <p className="form-notice" role="status">
          {!s.days.length
            ? "Booking is closed: select operating days below."
            : !durations.some(
                  (v) =>
                    v.duration &&
                    services.find((service) => service.id === v.id)?.active,
                )
              ? "Booking is closed: set at least one service duration above."
              : "This configuration enables booking for " +
                durations.filter(
                  (v) =>
                    v.duration &&
                    services.find((service) => service.id === v.id)?.active,
                ).length +
                " service(s) after you save settings."}
        </p>
      </div>
      <div className="admin-card">
        <h2>Working days & sessions</h2>
        <div className="days-picker">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name, i) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={s.days.includes(i)}
                onChange={(e) =>
                  update(
                    "days",
                    e.target.checked
                      ? [...s.days, i]
                      : s.days.filter((d) => d !== i),
                  )
                }
              />
              {name}
            </label>
          ))}
        </div>
        {s.sessions.map((session, i) => (
          <div className="form-grid" key={i}>
            <Field title={`Session ${i + 1} · opens (PKT)`}>
              <input
                required
                type="time"
                value={session.start}
                onChange={(e) =>
                  update(
                    "sessions",
                    s.sessions.map((v, j) =>
                      j === i ? { ...v, start: e.target.value } : v,
                    ),
                  )
                }
              />
            </Field>
            <Field title="Closes (PKT)">
              <input
                required
                type="time"
                value={session.end}
                onChange={(e) =>
                  update(
                    "sessions",
                    s.sessions.map((v, j) =>
                      j === i ? { ...v, end: e.target.value } : v,
                    ),
                  )
                }
              />
            </Field>
          </div>
        ))}
        <label className="check-label">
          <input
            type="checkbox"
            checked={s.eveningProvisional}
            onChange={(e) => update("eveningProvisional", e.target.checked)}
          />
          Evening closing time is still provisional
        </label>
        <div className="form-grid">
          <Field title="Slot interval (minutes)">
            <input
              type="number"
              min={5}
              max={120}
              value={s.interval}
              onChange={(e) => update("interval", +e.target.value)}
              required
            />
          </Field>
          <Field title="Shared clinic capacity">
            <input
              type="number"
              min={1}
              max={20}
              value={s.capacity}
              onChange={(e) => update("capacity", +e.target.value)}
              required
            />
          </Field>
        </div>
        <p className="form-help">
          Capacity is shared across all services, including overlapping visits.
          Confirm staffing before increasing it.
        </p>
      </div>
      <div className="admin-card">
        <h2>Closures & blocked periods</h2>
        <div className="form-grid">
          <Field title="Closure date">
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field title="From (optional)">
              <input
                type="time"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
              />
            </Field>
            <Field title="To (optional)">
              <input
                type="time"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={
            !blockDate ||
            !!blockStart !== !!blockEnd ||
            (!!blockStart && blockStart >= blockEnd)
          }
          onClick={() => {
            update("blocked", [
              ...s.blocked,
              {
                date: blockDate,
                ...(blockStart && blockEnd
                  ? { start: blockStart, end: blockEnd }
                  : {}),
              },
            ]);
            setBlockDate("");
            setBlockStart("");
            setBlockEnd("");
          }}
        >
          Add closure to draft
        </button>
        <div className="list-block">
          {s.blocked.map((b, i) => (
            <span className="tag" key={i}>
              {b.date} {b.start ? b.start + "–" + b.end : "All day"}
              <button
                type="button"
                aria-label="Remove closure"
                onClick={() =>
                  update(
                    "blocked",
                    s.blocked.filter((_, j) => i !== j),
                  )
                }
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <p className="form-help">
          Save settings to apply. Existing appointments are not cancelled
          automatically; review them after blocking a period.
        </p>
      </div>
      <div className="admin-card">
        <h2>Booking & privacy rules</h2>
        <div className="form-grid">
          <Field title="Pending hold expiry (minutes)">
            <input
              type="number"
              min={5}
              max={10080}
              value={s.holdMinutes}
              onChange={(e) => update("holdMinutes", +e.target.value)}
              required
            />
          </Field>
          <Field title="Minimum change notice (hours)">
            <input
              type="number"
              min={0}
              max={168}
              value={s.cancellationHours}
              onChange={(e) => update("cancellationHours", +e.target.value)}
              required
            />
          </Field>
        </div>
        <Field title="Inactive record retention (days)">
          <input
            type="number"
            min={7}
            max={3650}
            value={s.retentionDays}
            onChange={(e) => update("retentionDays", +e.target.value)}
            required
          />
        </Field>
        <p className="form-help">
          Policy text follows these settings. Run the retention action after
          review; active appointments and unresolved enquiries are preserved.
        </p>
      </div>
      <div className="admin-card">
        <h2>Public clinic content</h2>
        <Field title="Contact mobile">
          <input
            value={s.phone}
            onChange={(e) => update("phone", e.target.value)}
            required
            maxLength={30}
          />
        </Field>
        <Field title="Address">
          <input
            value={s.address}
            onChange={(e) => update("address", e.target.value)}
            required
            maxLength={300}
          />
        </Field>
        <Field title="Clinic-approved practitioner biography">
          <textarea
            value={s.bio}
            onChange={(e) => update("bio", e.target.value)}
            maxLength={2000}
          />
          <small>
            Empty biographies are hidden. Preserve the supplied qualification
            wording: DPT LUMHS & Ultrasonography.
          </small>
        </Field>
        <label className="check-label">
          <input
            type="checkbox"
            checked={s.whatsapp}
            onChange={(e) => update("whatsapp", e.target.checked)}
          />
          The clinic has confirmed WhatsApp availability on this number
        </label>
        <h3>Approved real clinic photographs</h3>
        <p className="form-help">
          Upload only clinic-approved images without patients or private
          records. Maximum 3 images, 512 KB each. Images publish after saving
          settings.
        </p>
        {(s.photos || []).map((photo, i) => (
          <div className="approved-photo-edit" key={photo.id}>
            <img src={photo.data} alt={photo.alt} />
            <Field title="Accessible image description">
              <input
                required
                value={photo.alt}
                minLength={5}
                maxLength={200}
                onChange={(e) =>
                  update(
                    "photos",
                    s.photos.map((p, j) =>
                      i === j ? { ...p, alt: e.target.value } : p,
                    ),
                  )
                }
              />
            </Field>
            <button
              type="button"
              className="table-action"
              onClick={() =>
                update(
                  "photos",
                  s.photos.filter((_, j) => i !== j),
                )
              }
            >
              Remove image
            </button>
          </div>
        ))}
        {(s.photos || []).length < 3 && (
          <Field title="Add an approved image (PNG, JPEG, WebP)">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 524288) {
                  setPhotoError("Image must be under 512 KB.");
                  return;
                }
                setPhotoError("");
                const r = new FileReader();
                r.onload = () =>
                  update("photos", [
                    ...(s.photos || []),
                    { id: uuid(), data: String(r.result), alt: "" },
                  ]);
                r.readAsDataURL(file);
                e.target.value = "";
              }}
            />
          </Field>
        )}
        {photoError && <p className="error">{photoError}</p>}
        <p className="form-help">
          The directions link uses the configured address. Exact map coordinates
          remain unverified.
        </p>
      </div>
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : "Save clinic settings"}
        <Check size={16} />
      </button>
    </form>
  );
}
function ServicesEditor({
  services,
  action,
}: {
  services: Service[];
  action: (name: string, data: any) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Service | null>(null),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="admin-card">
        <h2>Services</h2>
        <p className="admin-description">
          Set clinic-approved durations to enable booking. A blank duration
          disables online booking for that service.
        </p>
        {services.map((s) => (
          <div className="staff-row" key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <small>
                {s.duration
                  ? s.duration + " minutes"
                  : "Duration not configured"}{" "}
                · {s.active ? "Visible" : "Hidden"}
              </small>
            </div>
            <button className="table-action" onClick={() => setDraft({ ...s })}>
              Edit service
            </button>
          </div>
        ))}
        <button
          className="button secondary"
          style={{ marginTop: 20 }}
          onClick={() =>
            setDraft({
              id: "",
              name: "",
              description: "",
              duration: null,
              active: false,
            })
          }
        >
          <Plus size={15} />
          Add approved service
        </button>
      </div>
      {draft && (
        <div className="admin-card">
          <h2>Edit service</h2>
          <form
            className="admin-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              if (await action("service", { service: draft })) setDraft(null);
              setBusy(false);
            }}
          >
            <Field title="Stable service ID">
              <input
                required
                value={draft.id}
                pattern="[a-z0-9-]+"
                maxLength={80}
                disabled={services.some((s) => s.id === draft.id)}
                onChange={(e) => setDraft({ ...draft, id: e.target.value })}
              />
            </Field>
            <Field title="Public service name">
              <input
                required
                minLength={2}
                maxLength={100}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field title="Clinic-approved description">
              <textarea
                required
                minLength={5}
                maxLength={1000}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </Field>
            <Field title="Appointment duration (minutes)">
              <input
                type="number"
                min={5}
                max={240}
                value={draft.duration ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    duration: e.target.value ? +e.target.value : null,
                  })
                }
              />
            </Field>
            <label className="check-label">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.checked })
                }
              />
              Show on the public website
            </label>
            <div className="button-row">
              <button className="button primary" disabled={busy}>
                Save service
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDraft(null)}
              >
                Discard edits
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
function Team({
  team,
  action,
}: {
  team: Staff[];
  action: (name: string, data: any) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="admin-card">
        <h2>Staff access</h2>
        {team.map((u) => (
          <div className="staff-row" key={u.id}>
            <div>
              <strong>{u.name}</strong>
              <small>
                {u.email} · {u.role} · {u.active ? "Active" : "Inactive"}
              </small>
            </div>
            {u.active && (
              <button
                className="table-action"
                onClick={() => action("deactivate", { id: u.id })}
              >
                Deactivate
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="admin-card">
        <h2>Create staff account</h2>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget),
              form = e.currentTarget;
            setBusy(true);
            if (
              await action("staff", {
                name: f.get("name"),
                email: f.get("email"),
                password: f.get("password"),
                role: f.get("role"),
              })
            )
              form.reset();
            setBusy(false);
          }}
        >
          <div className="form-grid">
            <Field title="Staff name">
              <input required name="name" minLength={2} maxLength={80} />
            </Field>
            <Field title="Email">
              <input required type="email" name="email" maxLength={200} />
            </Field>
          </div>
          <Field title="Role">
            <select name="role">
              <option value="receptionist">
                Receptionist · appointments and enquiries
              </option>
              <option value="administrator">
                Administrator · full clinic access
              </option>
            </select>
          </Field>
          <Field title="Initial password (at least 14 characters)">
            <input
              required
              type="password"
              name="password"
              minLength={14}
              maxLength={200}
              autoComplete="new-password"
            />
          </Field>
          <button className="button primary" disabled={busy}>
            {busy ? "Creating…" : "Create staff account"}
          </button>
        </form>
      </div>
    </>
  );
}
export default function AdminApp() {
  const [session, setSession] = useState<any>(undefined),
    [data, setData] = useState<any>(null),
    [tab, setTab] = useState("Overview"),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [toastError, setToastError] = useState(false),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [date, setDate] = useState(""),
    [service, setService] = useState(""),
    [selected, setSelected] = useState<Appointment | null>(null),
    [create, setCreate] = useState(false);
  const load = async () => {
    try {
      const r = await api("dashboard");
      setData(r);
      setSession(r.staff);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    api("session")
      .then((r) => {
        setSession(r.staff);
        if (r.staff) load();
      })
      .catch((e) => {
        setSession(null);
        setError(e.message);
      });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (!session) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [session?.id]);
  const action = async (name: string, body: any) => {
    try {
      const r = await api(name, body);
      setToast(
        name === "retention"
          ? `Retention applied. ${r.count} inactive appointments removed.`
          : "Changes saved.",
      );
      setToastError(false);
      await load();
      return true;
    } catch (e: any) {
      setToast(e.message);
      setToastError(true);
      return false;
    }
  };
  if (session === undefined)
    return (
      <div className="login-page" role="status">
        Loading secure staff access…
      </div>
    );
  if (!session) return <Login onLogin={load} />;
  if (!data)
    return (
      <div className="login-page">
        <p>{error || "Loading dashboard…"}</p>
        <button className="button secondary" onClick={load}>
          Retry
        </button>
      </div>
    );
  const appointments: Appointment[] = data.appointments;
  const filtered = appointments
    .filter(
      (a) =>
        (!status || a.status === status) &&
        (!date || a.date === date) &&
        (!service || a.service === service) &&
        (!search ||
          [a.name, a.phone, a.reference]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  const nav = [
    ["Overview", Activity],
    ["Appointments", CalendarDays],
    ["Enquiries", Mail],
    ...(session.role === "administrator"
      ? [
          ["Services", ClipboardList],
          ["Clinic settings", SettingsIcon],
          ["Staff access", Users],
          ["Audit log", ShieldCheck],
          ["Operations", Clock],
        ]
      : []),
  ];
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        <nav aria-label="Staff navigation">
          {nav.map(([name, Icon]: any) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => {
                setTab(name);
                setError("");
              }}
            >
              <Icon size={17} />
              {name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="/">← Public website</a>
          <button
            style={{ textAlign: "start", display: "flex", gap: 8 }}
            onClick={async () => {
              try {
                await api("logout", {});
                setSession(null);
                setData(null);
              } catch (e: any) {
                setToast(e.message);
              }
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
          <small>Asia/Karachi · PKT</small>
        </div>
      </aside>
      <main className="admin-main" id="home">
        <div className="admin-top">
          <div>
            <span className="eyebrow">CLINIC ADMINISTRATION</span>
            <h1>{tab}</h1>
            <p>
              {session.name} · {session.role} · {data.today}
            </p>
          </div>
          <div className="session-user">
            <button
              className="icon-button"
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
              onClick={load}
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {["Overview", "Appointments"].includes(tab) && (
          <>
            <div className="stats">
              {[
                [
                  "Pending requests",
                  appointments.filter((a) => a.status === "pending").length,
                ],
                [
                  "Today’s visits",
                  appointments.filter(
                    (a) =>
                      a.date === data.today &&
                      ["pending", "confirmed"].includes(a.status),
                  ).length,
                ],
                [
                  "Confirmed",
                  appointments.filter((a) => a.status === "confirmed").length,
                ],
                [
                  "Completed",
                  appointments.filter((a) => a.status === "completed").length,
                ],
              ].map(([label, n]) => (
                <div className="stat" key={label}>
                  <span>{label}</span>
                  <strong>{n}</strong>
                </div>
              ))}
            </div>
            {!data.services.some((s: Service) => s.duration && s.active) && (
              <div className="info-banner">
                Online scheduling is closed.{" "}
                {session.role === "administrator"
                  ? "Set operating days and clinic-approved service durations in Clinic settings and Services."
                  : "An administrator must configure availability."}
              </div>
            )}
            <div className="admin-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <h2 style={{ margin: 0 }}>Appointment requests</h2>
                <button
                  className="button primary"
                  onClick={() => setCreate(true)}
                >
                  <Plus size={15} />
                  Phone booking
                </button>
              </div>
              <div className="admin-toolbar">
                <input
                  type="search"
                  placeholder="Search name, mobile or reference"
                  aria-label="Search appointments"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="Status filter"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select
                  aria-label="Service filter"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                >
                  <option value="">All services</option>
                  {data.services.map((s: Service) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  aria-label="Date filter"
                  value={date}
                  onInput={(e) => setDate(e.currentTarget.value)}
                  onChange={(e) => setDate(e.target.value)}
                />
                {(search || status || date || service) && (
                  <button
                    className="text-link"
                    onClick={() => {
                      setSearch("");
                      setStatus("");
                      setDate("");
                      setService("");
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Service</th>
                      <th>Visit (PKT)</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.name}</strong>
                          <small>{a.phone}</small>
                          <small>{a.reference}</small>
                        </td>
                        <td>
                          {
                            data.services.find(
                              (s: Service) => s.id === a.service,
                            )?.name
                          }
                        </td>
                        <td>
                          {a.date}
                          <small>{a.time}</small>
                        </td>
                        <td>
                          <span className={"status " + a.status}>
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <button
                            className="table-action"
                            onClick={() => setSelected(a)}
                          >
                            View & manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && (
                  <div className="empty">
                    No appointments match these filters.
                  </div>
                )}
              </div>
            </div>
            {tab === "Overview" && (
              <div className="admin-card">
                <h2>Recent enquiries</h2>
                {data.enquiries
                  .slice(-4)
                  .reverse()
                  .map((e: any) => (
                    <div className="staff-row" key={e.id}>
                      <div>
                        <strong>{e.name}</strong>
                        <small>{e.message.slice(0, 100)}</small>
                      </div>
                      <button
                        className="table-action"
                        onClick={() => setTab("Enquiries")}
                      >
                        View
                      </button>
                    </div>
                  ))}
                {!data.enquiries.length && (
                  <p className="empty">
                    New contact enquiries will appear here.
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {tab === "Enquiries" && (
          <div className="admin-card">
            <h2>Contact enquiries</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.enquiries].reverse().map((e: any) => (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.name}</strong>
                        <a href={"tel:" + e.phone}>{e.phone}</a>
                        <small>
                          {new Date(e.createdAt).toLocaleString("en-GB", {
                            timeZone: "Asia/Karachi",
                          })}
                        </small>
                      </td>
                      <td className="admin-table-note">{e.message}</td>
                      <td>
                        <span className="status">{e.status}</span>
                      </td>
                      <td>
                        {e.status === "new" && (
                          <button
                            className="table-action"
                            onClick={() => action("resolve", { id: e.id })}
                          >
                            Mark resolved
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.enquiries.length && (
              <p className="empty">No enquiries yet.</p>
            )}
          </div>
        )}
        {tab === "Services" && (
          <ServicesEditor services={data.services} action={action} />
        )}{" "}
        {tab === "Clinic settings" && (
          <SettingsForm
            settings={data.settings}
            services={data.services}
            action={action}
          />
        )}{" "}
        {tab === "Staff access" && <Team team={data.team} action={action} />}{" "}
        {tab === "Audit log" && (
          <div className="admin-card">
            <h2>Staff activity</h2>
            <p className="admin-description">
              Actor, action, target and timestamp only. Patient names, phone
              numbers and notes are excluded.
            </p>
            {data.audit.map((e: any) => (
              <div className="audit-entry" key={e.id}>
                <span>
                  {new Date(e.at).toLocaleString("en-GB", {
                    timeZone: "Asia/Karachi",
                  })}
                </span>
                <span>
                  {e.action}
                  <br />
                  Actor:{" "}
                  {data.team.find((u: Staff) => u.id === e.actor)?.name ||
                    e.actor}
                </span>
                <span>Target: {e.target}</span>
              </div>
            ))}
            {!data.audit.length && (
              <p className="empty">No audit events yet.</p>
            )}
          </div>
        )}
        {tab === "Operations" && (
          <>
            <div className="admin-card">
              <h2>Notifications</h2>
              <p className="form-notice">
                Provider:{" "}
                {data.notificationConfigured
                  ? "Configured HTTPS webhook — verify provider acceptance separately"
                  : "Not configured — staff must contact patients directly"}
              </p>
              <p className="admin-description">
                Requests are always saved independently of messaging. An
                optional HTTPS webhook can connect an authorized email or SMS
                provider. Provider acceptance is not confirmed delivery.
                WhatsApp requires an authorized integration.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Appointment</th>
                      <th>Notification status</th>
                      <th>Attempts</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.notifications.map((n: any) => (
                      <tr key={n.id}>
                        <td>
                          {appointments.find((a) => a.id === n.appointmentId)
                            ?.reference || n.appointmentId}
                        </td>
                        <td>
                          <span className="status">{n.status}</span>
                        </td>
                        <td>{n.attempts}</td>
                        <td>
                          <button
                            className="table-action"
                            onClick={() =>
                              action("notification-retry", { id: n.id })
                            }
                          >
                            Send / retry
                          </button>
                          {n.lastError && <small>{n.lastError}</small>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="form-notice">
                If no provider is configured, retries preserve the request and
                show “not configured.” A stable idempotency key is passed to
                providers to avoid duplicate messages. Verify provider
                idempotency before enabling.
              </p>
            </div>
            <div className="admin-card">
              <h2>Retention & deletion</h2>
              <p className="admin-description">
                Configured retention: {data.settings.retentionDays} days. Delete
                eligible inactive appointment and resolved enquiry records,
                expired sessions, notification records for removed appointments,
                and older audit events. This action cannot be undone here;
                verify your backup first.
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete eligible old records now? Ensure you have a backup before proceeding.",
                    )
                  )
                    action("retention", {});
                }}
              >
                Run retention cleanup
              </button>
            </div>
            <div className="admin-card">
              <h2>Launch checklist</h2>
              <ul style={{ fontSize: 12, color: "#66765e", lineHeight: 2 }}>
                <li>Confirm evening closing time: 7 PM versus 8 PM.</li>
                <li>
                  Confirm operating days, appointment durations and capacity.
                </li>
                <li>Confirm contact and WhatsApp availability.</li>
                <li>Verify exact map location.</li>
                <li>Review Urdu and Sindhi translations.</li>
                <li>
                  Approve service descriptions, biography and real photographs.
                </li>
                <li>Review retention and cancellation settings.</li>
                <li>Configure and test notification providers if needed.</li>
                <li>
                  Test backups, restoration and staff access before public
                  launch.
                </li>
              </ul>
            </div>
          </>
        )}
        {selected && (
          <AppointmentDetails
            appointment={selected}
            services={data.services}
            action={action}
            onClose={() => setSelected(null)}
          />
        )}{" "}
        {create && (
          <StaffBooking
            services={data.services}
            done={load}
            onClose={() => setCreate(false)}
          />
        )}{" "}
        {toast && (
          <div
            className={"admin-toast " + (toastError ? "error" : "")}
            role="status"
          >
            {toast}
            <button aria-label="Dismiss" onClick={() => setToast("")}>
              <X size={15} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
