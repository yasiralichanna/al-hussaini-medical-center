"use client";
import { serviceDescriptions, policyText } from "../localization/content";
import { uuid } from "./uuid";
import { useCallback } from "react";
import { useAvailability } from "../bookings/useAvailability";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Phone,
  MapPin,
  Clock,
  Plus,
  Activity,
  ScanLine,
  CalendarDays,
  ChevronDown,
  Check,
  ShieldCheck,
  Menu,
  X,
  Pause,
  Play,
  Sun,
  Moon,
  Heart,
  Copy,
  Mail,
} from "lucide-react";
import { LanguageProvider, useLanguage } from "../localization/context";
import type { Service, Settings } from "./types";
import { initialState } from "./types";
import { api } from "./api";
import CareVisual, { MotionGraphic } from "./CareVisual";
const fmt = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
const phone = "tel:+923003032956";
const directions =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent(initialState().settings.address);
function Logo() {
  return (
    <a href="/" className="brand" aria-label="Al-Hussaini Medical Center home">
      <span className="brand-symbol">
        <Plus strokeWidth={1.6} />
        <i />
      </span>
      <span>
        <strong>Al-Hussaini</strong>
        <small>MEDICAL CENTER</small>
      </span>
    </a>
  );
}
function Locale() {
  const { lang, setLang } = useLanguage();
  return (
    <label className="locale">
      <span className="sr-only">Language</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as any)}>
        <option value="en">EN · English</option>
        <option value="ur">اردو</option>
        <option value="sd">سنڌي</option>
      </select>
      <ChevronDown size={12} />
    </label>
  );
}
function Modal({
  children,
  title,
  onClose,
  wide = false,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const items = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button,a[href],input,select,textarea,[tabindex="0"]',
          ) ?? [],
        ).filter((v) => !v.hasAttribute("disabled") && v.offsetParent !== null);
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={21} />
        </button>
        {children}
      </div>
    </div>
  );
}
function ServiceIcon({ id }: { id: string }) {
  if (id === "ultrasound") return <ScanLine />;
  if (id === "physiotherapy") return <Activity />;
  if (id === "joint-pain")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <path d="M8 2l2 6-3 4-3-1M17 22l-3-7 3-3 4 2M10 8l6 2M7 12l7 3" />
        <circle cx="12" cy="12" r="3.4" />
      </svg>
    );
  if (id === "muscle-pain")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <path d="M4 19c3-8 8-3 9-8L11 6l3-3 4 2v5c4 7 2 11-6 10H4zM11 6l4 2" />
      </svg>
    );
  return <Heart />;
}
function Booking({
  selected,
  services,
  settings,
  configured,
  settingsLoading,
  configurationError,
  refreshSettings,
  onClose,
  draft,
}: {
  selected: string;
  services: Service[];
  settings: Settings;
  configured: boolean;
  settingsLoading: boolean;
  configurationError: string;
  refreshSettings: () => void;
  onClose: () => void;
  draft: React.MutableRefObject<any>;
}) {
  const { t, sn, lang } = useLanguage();
  const [step, setStep] = useState(draft.current?.step ?? 0),
    [form, setForm] = useState(
      draft.current?.form ?? {
        service:
          selected ||
          services.find((v) => v.duration)?.id ||
          services[0]?.id ||
          "ultrasound",
        date: "",
        time: "",
        name: "",
        phone: "",
        note: "",
        consent: false,
      },
    ),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<any>(draft.current?.result ?? null);
  const key = useRef(draft.current?.key ?? uuid());
  const privateToken = useRef(
    draft.current?.token ??
      Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
        v.toString(16).padStart(2, "0"),
      ).join(""),
  );
  useEffect(() => {
    draft.current = {
      form,
      step,
      result,
      key: key.current,
      token: privateToken.current,
    };
  }, [form, step, result]);
  const input = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const chosen = services.find((s) => s.id === form.service);
  const availability = useAvailability(
    form.service,
    form.date,
    JSON.stringify({
      duration: chosen?.duration,
      days: settings.days,
      sessions: settings.sessions,
      interval: settings.interval,
      blocked: settings.blocked,
    }),
  );
  const { slots, loading } = availability;
  useEffect(() => {
    if (form.time && !slots.includes(form.time)) input("time", "");
  }, [slots]);
  useEffect(() => {
    input("time", "");
  }, [form.service, form.date]);
  useEffect(() => {
    if (!selected && !chosen?.duration && services.some((v) => v.duration))
      input("service", services.find((v) => v.duration)!.id);
  }, [services, selected]);
  async function submit() {
    setSaving(true);
    setError("");
    try {
      const r = await api("booking", {
        ...form,
        idempotency: key.current,
        managementToken: privateToken.current,
      });
      setResult(r);
      setStep(2);
    } catch (e: any) {
      setError(e.message);
      availability.retry();
      setStep(0);
    } finally {
      setSaving(false);
    }
  }
  const [copy, setCopy] = useState(false);
  return (
    <Modal title={t("book")} onClose={onClose}>
      <div className="modal-heading">
        <span className="eyebrow">AL-HUSSAINI MEDICAL CENTER</span>
        <h2>
          {step === 2 ? t("received") : step === 1 ? t("review") : t("book")}
        </h2>
      </div>
      {step !== 2 && settingsLoading ? (
        <p className="form-notice" role="status">
          {t("loading")}
        </p>
      ) : step !== 2 && configurationError ? (
        <div className="error" role="alert">
          {t("settingsError")}
          <button className="button secondary" onClick={refreshSettings}>
            {t("retry")}
          </button>
        </div>
      ) : step !== 2 && (!configured || !chosen?.duration) ? (
        <div className="call-state">
          <label className="booking-service-choice">
            {t("service")}
            <select
              value={form.service}
              onChange={(e) => input("service", e.target.value)}
            >
              {services.map((v) => (
                <option value={v.id} key={v.id}>
                  {sn(v.id, v.name)}
                  {v.duration ? "" : " · " + t("notBookable")}
                </option>
              ))}
            </select>
          </label>
          <span className="large-icon">
            <CalendarDays />
          </span>
          <h3>{t("closed")}</h3>
          <p>{t("closedText")}</p>
          <button type="button" className="text-link" onClick={refreshSettings}>
            {t("refreshAvailability")}
          </button>
          <a className="button primary" href={phone}>
            <Phone size={16} />
            {t("call")}
            <bdi>0300-3032956</bdi>
          </a>
        </div>
      ) : step === 2 ? (
        <div className="booking-success">
          <div className="success-icon">
            <Check />
          </div>
          <span className="status pending">{t("pending")}</span>
          <p>{t("reference")}</p>
          <strong className="reference">{result.appointment.reference}</strong>
          <p>
            {sn(form.service)} ·{" "}
            <bdi>
              {form.date} · {form.time}
            </bdi>{" "}
            (Asia/Karachi)
          </p>
          <p className="muted">
            {t("manage")}: Keep this private link. Anyone with it can access
            your request.
          </p>
          <a
            className="button primary"
            href={"/manage#" + privateToken.current}
          >
            {t("manage")}
            <ArrowUpRight size={16} />
          </a>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  location.origin + "/manage#" + privateToken.current,
                );
                setCopy(true);
              } catch {
                setError(
                  "Copy the private management link using your browser’s link menu.",
                );
              }
            }}
          >
            <Copy size={15} />
            {copy ? "Copied" : t("manage") + " — Copy link"}
          </button>
          <button
            className="text-link"
            onClick={() => {
              key.current = uuid();
              privateToken.current = Array.from(
                crypto.getRandomValues(new Uint8Array(32)),
                (v) => v.toString(16).padStart(2, "0"),
              ).join("");
              setForm({
                service: selected || "ultrasound",
                date: "",
                time: "",
                name: "",
                phone: "",
                note: "",
                consent: false,
              });
              setResult(null);
              setCopy(false);
              setStep(0);
            }}
          >
            {t("book")}
          </button>
        </div>
      ) : step === 1 ? (
        <div className="review">
          <dl>
            {[
              ["name", form.name],
              ["phone", form.phone],
              ["service", sn(form.service)],
              ["date", form.date],
              ["time", form.time + " · Asia/Karachi"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{t(k as any)}</dt>
                <dd>
                  <bdi>{v}</bdi>
                </dd>
              </div>
            ))}
          </dl>
          <p className="form-notice">{t("reviewNote")}</p>
          <div className="button-row">
            <button className="button secondary" onClick={() => setStep(0)}>
              {t("back")}
            </button>
            <button
              className="button primary"
              disabled={saving}
              onClick={submit}
            >
              {saving ? t("loading") : t("submit")}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setStep(1);
          }}
          className="booking-form"
        >
          <p className="muted">{t("reviewNote")}</p>
          <label>
            {t("service")}
            <select
              value={form.service}
              onChange={(e) => input("service", e.target.value)}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {sn(s.id, s.name)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("date")}
            <input
              required
              type="date"
              value={form.date}
              min={new Date(Date.now() + 5 * 3600000)
                .toISOString()
                .slice(0, 10)}
              max={new Date(Date.now() + 90 * 86400000)
                .toISOString()
                .slice(0, 10)}
              onInput={(e) => input("date", e.currentTarget.value)}
              onChange={(e) => input("date", e.target.value)}
            />
          </label>
          <fieldset>
            <legend>
              {t("time")} <small>Asia/Karachi</small>
            </legend>
            {loading ? (
              <p role="status">{t("loading")}</p>
            ) : (
              <div className="slot-grid">
                {slots.map((s) => (
                  <label
                    className={"slot " + (form.time === s ? "selected" : "")}
                    key={s}
                  >
                    <input
                      required
                      type="radio"
                      name="slot"
                      value={s}
                      checked={form.time === s}
                      onChange={() => input("time", s)}
                    />
                    <bdi>{s}</bdi>
                  </label>
                ))}
              </div>
            )}
            {form.date && !loading && !slots.length && !availability.error && (
              <p className="form-notice">
                {lang === "en"
                  ? availability.message || t("noSlots")
                  : t("noSlots")}
              </p>
            )}
            {availability.error && (
              <p className="error" role="alert">
                {t("timesError")}{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={availability.retry}
                >
                  {t("retry")}
                </button>
              </p>
            )}
          </fieldset>
          <div className="form-grid">
            <label>
              {t("name")}
              <input
                required
                maxLength={100}
                minLength={2}
                autoComplete="name"
                value={form.name}
                onChange={(e) => input("name", e.target.value)}
              />
            </label>
            <label>
              {t("phone")}
              <input
                required
                type="tel"
                dir="ltr"
                maxLength={30}
                autoComplete="tel"
                placeholder="0300 0000000"
                value={form.phone}
                onChange={(e) => input("phone", e.target.value)}
              />
            </label>
          </div>
          <label>
            {t("note")}
            <textarea
              maxLength={500}
              value={form.note}
              onChange={(e) => input("note", e.target.value)}
              aria-describedby="note-help"
            />
            <small id="note-help">{t("noteHelp")}</small>
          </label>
          <label className="check-label">
            <input
              required
              type="checkbox"
              checked={form.consent}
              onChange={(e) => input("consent", e.target.checked)}
            />
            {t("consent")}
          </label>
          <button
            className="button primary full"
            disabled={!form.time || loading}
          >
            {t("review")}
            <ArrowRight size={16} />
          </button>
          <small className="secure-note">
            <ShieldCheck size={14} />
            {t("secure")}
          </small>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
function Tour({
  onClose,
  book,
  services,
}: {
  onClose: () => void;
  book: (service: string) => void;
  services: Service[];
}) {
  const { t, lang, sn } = useLanguage();
  const [current, setCurrent] = useState("ultrasound");
  const [paused, setPaused] = useState(false);
  useEffect(
    () => setPaused(matchMedia("(prefers-reduced-motion: reduce)").matches),
    [],
  );
  const service = services.find((v) => v.id === current) || services[0];
  return (
    <Modal wide title={t("tour")} onClose={onClose}>
      <div className="tour-title">
        <span className="eyebrow">AL-HUSSAINI MEDICAL CENTER</span>
        <h2>{t("tour")}</h2>
        <p>{t("serviceSub")}</p>
      </div>
      <div className="care-guide-layout">
        <div className="care-guide-image">
          {service?.id === "ultrasound" ? (
            <CareVisual
              compact
              paused={paused}
              onToggle={() => setPaused((v) => !v)}
            />
          ) : (
            <div
              className={
                "care-graphic-panel " + (paused ? "motion-paused" : "")
              }
            >
              <span className="eyebrow">{t("care")}</span>
              <span className="care-graphic-icon">
                <ServiceIcon id={service?.id || "physiotherapy"} />
              </span>
              <h3>{sn(service?.id || "", service?.name)}</h3>
              <MotionGraphic />
              <p>{t("consult")}</p>
              <button
                className="motion-toggle"
                onClick={() => setPaused((v) => !v)}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}{" "}
                {paused ? t("resume") : t("pause")}
              </button>
            </div>
          )}
        </div>
        <aside className="care-guide-panel">
          <div
            className="care-guide-tabs"
            role="tablist"
            aria-label={t("services")}
          >
            {services.map((v) => (
              <button
                key={v.id}
                id={"care-tab-" + v.id}
                role="tab"
                aria-selected={service?.id === v.id}
                aria-controls="care-service-panel"
                className={service?.id === v.id ? "active" : ""}
                onClick={() => setCurrent(v.id)}
              >
                <ServiceIcon id={v.id} />
                {sn(v.id, v.name)}
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
          {service && (
            <div
              id="care-service-panel"
              role="tabpanel"
              aria-labelledby={"care-tab-" + service.id}
            >
              <h3>{sn(service.id, service.name)}</h3>
              <p>
                {lang === "en"
                  ? service.description
                  : serviceDescriptions[lang][service.id] || t("consult")}
              </p>
              <small>{t("reviewNote")}</small>
              <button
                className="button primary full"
                onClick={() => book(service.id)}
              >
                {t("book")}
                <ArrowUpRight size={15} />
              </button>
              <a href={phone} className="text-link">
                <Phone size={14} />
                {t("call")}
              </a>
            </div>
          )}
        </aside>
      </div>
    </Modal>
  );
}
function Enquiry() {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false);
  return success ? (
    <div className="enquiry-done" role="status">
      <Check />
      <h3>{t("sent")}</h3>
    </div>
  ) : (
    <form
      className="enquiry-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setMessage("");
        try {
          await api("enquiry", {
            name: f.get("name"),
            phone: f.get("phone"),
            message: f.get("message"),
            consent: true,
          });
          setSuccess(true);
        } catch (e: any) {
          setMessage(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{t("enquiry")}</h3>
      <div className="form-grid">
        <label>
          {t("name")}
          <input
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
          />
        </label>
        <label>
          {t("phone")}
          <input
            name="phone"
            type="tel"
            dir="ltr"
            autoComplete="tel"
            maxLength={30}
            required
          />
        </label>
      </div>
      <label>
        {t("message")}
        <textarea name="message" minLength={5} maxLength={1000} required />
        <small>{t("noteHelp")}</small>
      </label>
      <label className="check-label">
        <input type="checkbox" required />
        {t("enquiryConsent")}
      </label>
      <button className="button primary" disabled={busy}>
        {busy ? t("loading") : t("send")}
        <ArrowUpRight size={16} />
      </button>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
function Policy({
  kind,
  settings,
  onClose,
}: {
  kind: "privacy" | "policy";
  settings: Settings;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  return (
    <Modal title={t(kind)} onClose={onClose}>
      <span className="eyebrow">AL-HUSSAINI MEDICAL CENTER</span>
      <h2>{t(kind)}</h2>
      {lang !== "en" && <p className="form-notice">{t("translations")}</p>}
      {lang !== "en" ? (
        <div className="policy-copy">
          {policyText[lang][kind].map((p, i) => (
            <p key={i}>
              {p
                .replace("{retention}", String(settings.retentionDays))
                .replace("{hold}", String(settings.holdMinutes))
                .replace("{cancel}", String(settings.cancellationHours))}
            </p>
          ))}
          <p>{t("notice")}</p>
        </div>
      ) : kind === "privacy" ? (
        <div className="policy-copy">
          <p>
            We collect your name, mobile number, selected service, appointment
            time, optional note and consent to arrange your visit. Enquiries are
            shared only with authorized clinic staff.
          </p>
          <p>
            Do not submit medical records or sensitive health information. This
            is a scheduling website, not an electronic medical record system.
          </p>
          <p>
            Appointment details are stored in the clinic database. Management
            links contain a private token: keep yours confidential. Staff access
            uses an HTTP-only session cookie. Your language choice is stored on
            this device. No analytics or advertising integrations are installed.
            The browser may contact Google Fonts for typography.
          </p>
          <p>
            The clinic may contact you directly. If an optional messaging
            provider is configured, only the contact and scheduling details
            needed for the notification are shared; medical notes are excluded.
            Completed and inactive records are eligible for manual deletion
            after {settings.retentionDays} days; active appointments and
            unresolved enquiries are retained until handled. Backups may retain
            older data until rotated.
          </p>
          <p>
            Call <a href={phone}>0300-3032956</a> to ask for access, correction
            or deletion of your details.
          </p>
        </div>
      ) : (
        <div className="policy-copy">
          <p>
            A submitted request is <strong>pending</strong>, not confirmed. The
            clinic must contact you to confirm your visit. Do not travel based
            only on a request receipt.
          </p>
          <p>
            Pending requests hold a time for {settings.holdMinutes} minutes.
            Unconfirmed requests expire automatically and release that time.
            Staff may offer a different time.
          </p>
          <p>
            Use your private management link to cancel or request a new time at
            least {settings.cancellationHours} hours before the appointment.
            Rescheduling a patient request requires confirmation again. After
            this window, call the clinic.
          </p>
          <p>
            Online availability opens only after staff configure working days
            and service durations. No fees or online payments are published.
          </p>
          <p>{t("notice")}</p>
        </div>
      )}
    </Modal>
  );
}
function Website({ initialView }: { initialView?: string }) {
  const { t, lang, sn } = useLanguage();
  const draft = useRef<any>(null);
  const [services, setServices] = useState(initialState().services),
    [settings, setSettings] = useState(initialState().settings),
    [configured, setConfigured] = useState(false),
    [settingsLoading, setSettingsLoading] = useState(true),
    [configurationError, setConfigurationError] = useState(""),
    [booking, setBooking] = useState<string | null>(
      initialView === "book" ? "" : null,
    ),
    [tour, setTour] = useState(initialView === "virtual"),
    [policy, setPolicy] = useState<"privacy" | "policy" | null>(null),
    [detail, setDetail] = useState<Service | null>(null),
    [menu, setMenu] = useState(false),
    [paused, setPaused] = useState(false);
  const requestVersion = useRef(0);
  const refreshClinic = useCallback(async () => {
    const version = ++requestVersion.current;
    setSettingsLoading(true);
    setConfigurationError("");
    try {
      const r = await api("public");
      if (version !== requestVersion.current) return;
      setSettings(r.settings);
      setServices(r.services);
      setConfigured(r.configured);
    } catch (e: any) {
      if (version === requestVersion.current) setConfigurationError(e.message);
    } finally {
      if (version === requestVersion.current) setSettingsLoading(false);
    }
  }, []);
  useEffect(() => {
    refreshClinic();
    setPaused(matchMedia("(prefers-reduced-motion: reduce)").matches);
    const onVisible = () => {
      if (!document.hidden) refreshClinic();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshClinic]);
  const phone = "tel:" + settings.phone;
  const directions =
    "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(settings.address);
  const book = (id = "") => {
    void refreshClinic();
    if (id && draft.current?.form) draft.current.form.service = id;
    setTour(false);
    setDetail(null);
    setBooking(id);
  };
  return (
    <>
      <div className="topline">
        <div>
          <span>
            <MapPin size={12} />
            {lang === "en" ? "BHAN SYEDABAD, SINDH" : t("location")}
          </span>
          <span>
            <Clock size={12} />
            <bdi>
              {settings.sessions
                .map((v) => fmt(v.start) + "–" + fmt(v.end))
                .join(" · ")}
              {settings.eveningProvisional ? "*" : ""}
            </bdi>
          </span>
          <a href={phone}>
            <Phone size={12} />
            <bdi>0300-3032956</bdi>
          </a>
        </div>
      </div>
      <header className="header">
        <div className="nav-wrap">
          <Logo />
          <nav
            className={menu ? "nav open" : "nav"}
            aria-label="Main navigation"
          >
            {[
              ["home", "#home"],
              ["services", "#services"],
              ["about", "#about"],
              ["tour", "tour"],
              ["contact", "#contact"],
            ].map(([k, h]) =>
              h === "tour" ? (
                <button
                  key={k}
                  onClick={() => {
                    setTour(true);
                    setMenu(false);
                  }}
                >
                  {t(k as any)}
                </button>
              ) : (
                <a key={k} href={h} onClick={() => setMenu(false)}>
                  {t(k as any)}
                </a>
              ),
            )}
          </nav>
          <div className="header-actions">
            <Locale />
            <button
              className="button primary header-book"
              onClick={() => book()}
            >
              {t("book")}
              <ArrowUpRight size={15} />
            </button>
            <button
              className="icon-button menu-button"
              aria-label={t("menu")}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main>
        <section id="home" className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-cross">+</span>
              {t("eyebrow")}
            </div>
            <p className="hero-display">
              {t("headline")
                .split("\n")
                .map((line, i) => (
                  <React.Fragment key={line}>
                    {i > 0 && <br />}
                    {i === 1 ? <em>{line}</em> : line}
                  </React.Fragment>
                ))}
            </p>
            <h1 className="hero-intro">{t("intro")}</h1>
            <p className="hero-sub">{t("sub")}</p>
            <div className="hero-buttons">
              <button className="button primary" onClick={() => book()}>
                {t("book")}
                <ArrowUpRight size={17} />
              </button>
              <button className="button text" onClick={() => setTour(true)}>
                <span className="play-icon">
                  <Play size={11} fill="currentColor" />
                </span>
                {t("explore")}
              </button>
            </div>
            <div className="hero-practitioner">
              <span className="practitioner-monogram">KA</span>
              <div>
                <strong>Dr. Komal Awais</strong>
                <small dir="ltr">DPT LUMHS & Ultrasonography</small>
              </div>
              <span className="mini-line" />
              <Phone size={15} />
              <a href={phone}>{t("call")}</a>
            </div>
          </div>
          <div className="hero-visual photo-hero">
            <CareVisual paused={paused} onToggle={() => setPaused((v) => !v)} />
          </div>
        </section>
        <div className="care-strip">
          <div>
            <ScanLine />
            <span>{sn("ultrasound")}</span>
          </div>
          <span className="strip-plus">+</span>
          <div>
            <Activity />
            <span>{sn("physiotherapy")}</span>
          </div>
          <span className="strip-plus">+</span>
          <div>
            <MapPin />
            <span>
              {lang === "en" ? "Rooted in Bhan Syedabad" : t("location")}
            </span>
          </div>
          <a href={phone}>
            {t("consult")}
            <ArrowUpRight size={16} />
          </a>
        </div>
        <section id="services" className="section services-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t("care")}</span>
              <h2>{t("serviceTitle")}</h2>
            </div>
            <p>{t("serviceSub")}</p>
          </div>
          <div className="services-grid">
            {services.map((s, i) => (
              <article
                className={"service-card " + (i === 0 ? "featured" : "")}
                key={s.id}
              >
                <span className="service-number">0{i + 1}</span>
                <span className="service-icon">
                  <ServiceIcon id={s.id} />
                </span>
                <h3>{sn(s.id, s.name)}</h3>
                <p>
                  {lang === "en"
                    ? s.description
                    : serviceDescriptions[lang][s.id] || t("consult")}
                </p>
                <button className="service-link" onClick={() => setDetail(s)}>
                  <span>{lang === "en" ? "Explore care" : t("services")}</span>
                  <ArrowUpRight size={19} />
                </button>
              </article>
            ))}
          </div>
        </section>
        <section id="about" className="section about-section">
          <div className="about-art" aria-hidden="true">
            <div className="about-rings" />
            <div className="about-cross">
              <Plus strokeWidth={0.8} />
            </div>
            <span>CARE. COMFORT. CONNECTION.</span>
            <div className="art-note">
              Al-Hussaini <small>MEDICAL CENTER</small>
            </div>
          </div>
          <div className="about-copy">
            <span className="eyebrow">{t("meet")}</span>
            <h2>{t("practitioner")}</h2>
            <h3>Dr. Komal Awais</h3>
            <p className="qualification" dir="ltr">
              DPT LUMHS & Ultrasonography
            </p>
            <p>{t("practitionerText")}</p>
            {settings.bio && <p>{settings.bio}</p>}
            <div className="about-services">
              <span>
                <Check size={15} />
                {sn("ultrasound")}
              </span>
              <span>
                <Check size={15} />
                {sn("physiotherapy")}
              </span>
            </div>
            <button className="button secondary" onClick={() => book()}>
              {t("book")}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </section>
        {settings.photos?.length > 0 && (
          <section className="section clinic-photos">
            <span className="eyebrow">AL-HUSSAINI MEDICAL CENTER</span>
            <h2>{t("about")}</h2>
            <div>
              {settings.photos.map((photo) => (
                <figure key={photo.id}>
                  <img src={photo.data} alt={photo.alt} loading="lazy" />
                  <figcaption>{photo.alt}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
        <section className="tour-banner">
          <div className="tour-banner-art care-banner-art">
            <span className="care-banner-plus">+</span>
            <MotionGraphic />
          </div>
          <div>
            <span className="eyebrow">{t("illustrative")}</span>
            <h2>{lang === "en" ? "Care, made simple." : t("explore")}</h2>
            <p>
              {lang === "en"
                ? "Get to know our ultrasound and physiotherapy services, then take the next step with a simple appointment request."
                : t("illustrationNote")}
            </p>
            <button className="button light" onClick={() => setTour(true)}>
              {t("explore")}
              <ArrowUpRight size={17} />
            </button>
          </div>
          <small>{t("illustrationNote")}</small>
        </section>
        <section className="section steps-section">
          <span className="eyebrow">
            {lang === "en" ? "A SIMPLE START" : t("book")}
          </span>
          <h2>{t("stepTitle")}</h2>
          <div className="steps">
            {[
              ["choose", "chooseText", CalendarDays],
              ["request", "requestText", Mail],
              ["confirm", "confirmText", Phone],
            ].map(([a, b, Icon]: any, i) => (
              <div key={a}>
                <span className="step-number">0{i + 1}</span>
                <div className="step-line" />
                <Icon size={26} strokeWidth={1.2} />
                <h3>{t(a)}</h3>
                <p>{t(b)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="visit-section section" id="contact">
          <div className="visit-info">
            <span className="eyebrow">
              {lang === "en" ? "VISIT YOUR LOCAL CLINIC" : t("contact")}
            </span>
            <h2>{t("location")}</h2>
            <div className="contact-address">
              <MapPin />
              <p>
                {settings.address === initialState().settings.address
                  ? t("address")
                  : settings.address}
              </p>
            </div>
            <a
              className="button secondary"
              href={directions}
              target="_blank"
              rel="noreferrer"
            >
              {t("directions")}
              <ArrowUpRight size={16} />
            </a>
            <div className="hours">
              <h3>{t("hours")}</h3>
              <div>
                <Sun size={18} />
                <span>{t("morning")}</span>
                <bdi>
                  {settings.sessions[0]
                    ? fmt(settings.sessions[0].start) +
                      "–" +
                      fmt(settings.sessions[0].end)
                    : "—"}
                </bdi>
              </div>
              <div>
                <Moon size={17} />
                <span>{t("evening")}</span>
                <bdi>
                  {settings.sessions[1]
                    ? fmt(settings.sessions[1].start) +
                      "–" +
                      fmt(settings.sessions[1].end)
                    : "—"}
                  {settings.eveningProvisional ? "*" : ""}
                </bdi>
              </div>
              <small>
                {settings.eveningProvisional && "* " + t("provisional")}{" "}
                {settings.days.length
                  ? settings.days
                      .map((d) =>
                        new Intl.DateTimeFormat(
                          lang === "en"
                            ? "en-GB"
                            : lang === "ur"
                              ? "ur-PK"
                              : "sd-PK",
                          { weekday: "long", timeZone: "UTC" },
                        ).format(new Date(Date.UTC(2026, 10, 1 + d))),
                      )
                      .join(" · ")
                  : t("days")}
              </small>
            </div>
            <a href={"tel:" + settings.phone} className="contact-phone">
              <Phone size={21} />
              <span>
                <small>{t("call")}</small>
                <bdi>{settings.phone}</bdi>
              </span>
              <ArrowUpRight size={20} />
            </a>
            {settings.whatsapp && (
              <a
                className="text-link"
                href={
                  "https://wa.me/" +
                  settings.phone.replace(/\D/g, "") +
                  "?text=Hello%2C%20I%20have%20a%20general%20clinic%20enquiry."
                }
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>
          <Enquiry />
        </section>
      </main>
      <footer>
        <div className="footer-main">
          <div>
            <Logo />
            <p>{t("footer")}</p>
            <p className="full-name">
              Al-Hussaini Digital Ultrasound and Physiotherapy Medical Center
            </p>
          </div>
          <div>
            <strong>{t("contact")}</strong>
            <p>
              {settings.address === initialState().settings.address
                ? t("address")
                : settings.address}
            </p>
            <a href={phone}>
              <bdi>+92 300 3032956</bdi>
            </a>
          </div>
          <div className="footer-links">
            <strong>{lang === "en" ? "Quick links" : t("menu")}</strong>
            <button onClick={() => book()}>{t("book")}</button>
            <button onClick={() => setTour(true)}>{t("tour")}</button>
            <a href="/admin">{t("staff")}</a>
          </div>
        </div>
        <div className="footer-notice">
          <ShieldCheck size={16} />
          <p>{t("notice")}</p>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Al-Hussaini Medical Center</span>
          <div>
            <button onClick={() => setPolicy("privacy")}>{t("privacy")}</button>
            <button onClick={() => setPolicy("policy")}>{t("policy")}</button>
          </div>
        </div>
        {lang !== "en" && (
          <p className="translation-notice">{t("translations")}</p>
        )}
      </footer>
      <div className="mobile-bar">
        <button onClick={() => book()}>
          <CalendarDays size={18} />
          {t("book")}
        </button>
        <a href={phone}>
          <Phone size={18} />
          {t("call")}
        </a>
        <a href={directions} target="_blank" rel="noreferrer">
          <MapPin size={18} />
          {t("directions")}
        </a>
      </div>
      {tour && (
        <Tour onClose={() => setTour(false)} book={book} services={services} />
      )}
      <div hidden={booking === null}>
        {booking !== null && (
          <Booking
            draft={draft}
            selected={booking}
            services={services}
            settings={settings}
            configured={configured}
            settingsLoading={settingsLoading}
            configurationError={configurationError}
            refreshSettings={refreshClinic}
            onClose={() => setBooking(null)}
          />
        )}
      </div>
      {policy && (
        <Policy
          kind={policy}
          settings={settings}
          onClose={() => setPolicy(null)}
        />
      )}{" "}
      {detail && (
        <Modal
          title={sn(detail.id, detail.name)}
          onClose={() => setDetail(null)}
        >
          <span className="large-icon">
            <ServiceIcon id={detail.id} />
          </span>
          <span className="eyebrow">{t("care")}</span>
          <h2>{sn(detail.id, detail.name)}</h2>
          <p className="detail-copy">
            {lang === "en"
              ? detail.description
              : serviceDescriptions[lang][detail.id] || t("consult")}
          </p>
          <p className="muted">
            {lang === "en"
              ? "Contact the clinic for suitability, preparation requirements, and appointment details. Individual care is discussed at your visit."
              : t("reviewNote")}
          </p>
          <div className="button-row">
            <button className="button primary" onClick={() => book(detail.id)}>
              {t("book")}
              <ArrowUpRight size={16} />
            </button>
            <a className="button secondary" href={phone}>
              {t("call")}
            </a>
          </div>
        </Modal>
      )}
    </>
  );
}
export default function PublicApp({ initialView }: { initialView?: string }) {
  return (
    <LanguageProvider>
      <Website initialView={initialView} />
    </LanguageProvider>
  );
}
