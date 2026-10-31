export async function api(action: string, data?: Record<string, unknown>) {
  const res = await fetch(
    "/api/clinic" + (data ? "" : "?action=" + encodeURIComponent(action)),
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...data }),
        }
      : { cache: "no-store" },
  );
  const result: any = await res.json();
  if (!res.ok) throw new Error(result.error || "Please try again.");
  return result;
}
