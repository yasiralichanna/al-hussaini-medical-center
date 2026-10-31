"use client";
import { useEffect, useState } from "react";
import { availabilityMessages } from "./readiness";
export function useAvailability(
  service: string,
  date: string,
  refreshKey: string | number = "",
) {
  const [slots, setSlots] = useState<string[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [reason, setReason] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setSlots([]);
    setError("");
    setReason(null);
    if (!date || !service) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(
      "/api/clinic?" + new URLSearchParams({ action: "slots", service, date }),
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (r) => {
        const data: any = await r.json();
        if (!r.ok)
          throw new Error(data.error || "Could not load available times.");
        if (!Array.isArray(data.slots))
          throw new Error("Could not load available times.");
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setSlots(data.slots);
          setReason(data.reason);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [service, date, attempt, refreshKey]);
  return {
    slots,
    loading,
    error,
    reason,
    message: reason
      ? availabilityMessages[reason] || "No times are available."
      : "",
    retry: () => setAttempt((v) => v + 1),
  };
}
