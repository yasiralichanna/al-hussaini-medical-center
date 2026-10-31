"use client";
import { useEffect, useState } from "react";
import { Plus, ArrowRight, Phone, Check, ChevronDown } from "lucide-react";
import { LanguageProvider, useLanguage } from "../localization/context";
import { api } from "../clinic/api";
import { localDate } from "./availability";
function Management() {
  const { t, sn, lang, setLang } = useLanguage();
  const [token, setToken] = useState(""),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [date, setDate] = useState(""),
    [slots, setSlots] = useState<string[]>([]),
    [time, setTime] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    const raw = location.hash.slice(1);
    history.replaceState(null, "", "/manage");
    setToken(raw);
    if (!raw) {
      setError(
        "Open the private management link from your booking receipt. A booking reference alone cannot access appointment details.",
      );
      return;
    }
    api("manage", { token: raw, operation: "read" })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setTime("");
    setSlots([]);
    if (!date || !data) return;
    api("manage", { token, operation: "slots", date })
      .then((r) => setSlots(r.slots || []))
      .catch(() => setError(t("error")));
  }, [date, data?.appointment.service]);
  async function change(operation: string) {
    setBusy(true);
    setError("");
    try {
      setData(await api("manage", { token, operation, date, time }));
      setMessage(t("saved"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const a = data?.appointment;
  return (
    <main className="manage-page" id="home">
      <a href="/" className="brand">
        <span className="brand-symbol">
          <Plus />
        </span>
        <span>
          <strong>Al-Hussaini</strong>
          <small>MEDICAL CENTER</small>
        </span>
      </a>
      <div className="manage-card">
        <label className="locale">
          <span className="sr-only">Language</span>
          <select value={lang} onChange={(e) => setLang(e.target.value as any)}>
            <option value="en">English</option>
            <option value="ur">اردو</option>
            <option value="sd">سنڌي</option>
          </select>
        </label>
        <span className="eyebrow">PRIVATE APPOINTMENT ACCESS</span>
        <h1>{t("manage")}</h1>
        {!a && !error && <p role="status">{t("loading")}</p>}
        {a && (
          <>
            <span className={"status " + a.status}>{t(a.status)}</span>
            <dl>
              {[
                ["reference", a.reference],
                ["name", a.name],
                ["service", sn(a.service)],
                ["date", a.date],
                ["time", a.time + " · Asia/Karachi"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{t(k as any)}</dt>
                  <dd>
                    <bdi>{v}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
            {a.status === "pending" && (
              <p className="form-notice">
                {t("reviewNote")}{" "}
                <bdi>
                  {new Date(a.holdUntil).toLocaleString(
                    lang === "en" ? "en-GB" : lang === "ur" ? "ur-PK" : "sd-PK",
                    { timeZone: "Asia/Karachi" },
                  )}
                </bdi>
              </p>
            )}
            {["pending", "confirmed"].includes(a.status) && (
              <>
                <p className="muted">
                  {t("cancelWindow")} ({data.settings.cancellationHours} h)
                </p>
                <form
                  className="manage-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    change("reschedule");
                  }}
                >
                  <h3>{t("reschedule")}</h3>
                  <div className="form-grid">
                    <label>
                      {t("date")}
                      <input
                        type="date"
                        required
                        min={localDate()}
                        value={date}
                        onInput={(e) => setDate(e.currentTarget.value)}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <label>
                      {t("time")}
                      <select
                        required
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      >
                        <option value="">{t("select")}</option>
                        {slots.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {date && !slots.length && (
                    <p className="form-notice">{t("noSlots")}</p>
                  )}
                  <button className="button primary" disabled={busy || !time}>
                    {busy ? t("loading") : t("reschedule")}
                    <ArrowRight size={15} />
                  </button>
                </form>
                <div className="button-row">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(t("cancel") + "?")) change("cancel");
                    }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </>
            )}
          </>
        )}
        {message && (
          <p className="form-notice" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <a
          className="text-link"
          href="tel:+923003032956"
          style={{ marginTop: 20 }}
        >
          <Phone size={15} />
          {t("call")}
          <bdi>0300-3032956</bdi>
        </a>
        <p className="muted" style={{ marginTop: 20 }}>
          {t("notice")}
        </p>
      </div>
    </main>
  );
}
export default function ManageApp() {
  return (
    <LanguageProvider>
      <Management />
    </LanguageProvider>
  );
}
