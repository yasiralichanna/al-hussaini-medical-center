"use client";
import { Activity, Pause, Play, ScanLine } from "lucide-react";
import { useLanguage } from "../localization/context";
export function MotionGraphic() {
  return (
    <svg
      className="care-wave"
      viewBox="0 0 360 120"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="wave-grid"
        d="M0 30H360M0 60H360M0 90H360M30 0V120M90 0V120M150 0V120M210 0V120M270 0V120M330 0V120"
      />
      <path
        className="wave-glow"
        d="M0 67H68L83 56L96 75L114 32L136 96L154 55L166 67H222L237 57L249 72L264 43L284 85L298 67H360"
      />
      <path
        className="wave-line"
        d="M0 67H68L83 56L96 75L114 32L136 96L154 55L166 67H222L237 57L249 72L264 43L284 85L298 67H360"
      />
    </svg>
  );
}
export default function CareVisual({
  paused,
  onToggle,
  compact = false,
}: {
  paused: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const { t, lang } = useLanguage();
  return (
    <div
      className={
        "care-visual " +
        (paused ? "motion-paused " : "") +
        (compact ? "compact" : "")
      }
    >
      <img
        className="care-photo"
        src="/ultrasound-illustration.webp"
        alt={
          lang === "en"
            ? "Realistic illustration of a digital ultrasound machine, probes, treatment bed and stool"
            : t("illustrationNote")
        }
        width={1254}
        height={1254}
        fetchPriority={compact ? "auto" : "high"}
      />
      <div className="photo-shade" />
      <span className="photo-label">
        <ScanLine size={13} />
        {t("illustrative")}
      </span>
      <div className="care-visual-caption">
        <span className="caption-icon">
          <ScanLine size={22} />
        </span>
        <div>
          <small>AL-HUSSAINI MEDICAL CENTER</small>
          <strong>{t("ultrasound")}</strong>
        </div>
      </div>
      <div className="motion-card">
        <span>
          <Activity size={12} />
          {lang === "en" ? "THOUGHTFUL CARE" : t("care")}
        </span>
        <MotionGraphic />
        <small>
          {lang === "en" ? "Decorative motion graphic" : t("motionGraphic")}
        </small>
      </div>
      <div className="visual-bottom">
        <span>{t("illustrationNote")}</span>
        <button
          className="motion-toggle"
          onClick={onToggle}
          aria-label={paused ? t("resume") : t("pause")}
          title={paused ? t("resume") : t("pause")}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          <span>{paused ? t("resume") : t("pause")}</span>
        </button>
      </div>
    </div>
  );
}
