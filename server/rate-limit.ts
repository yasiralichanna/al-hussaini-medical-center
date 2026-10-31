import { mutate } from "./store";
import { hash } from "../modules/auth/crypto";
export async function rateLimit(req: Request, scope: string, max = 12) {
  // Only trust IP headers when an operator has configured an overwriting proxy.
  const mode = process.env.TRUST_PROXY_IP;
  const ip =
    (mode === "cloudflare"
      ? req.headers.get("cf-connecting-ip")
      : mode === "reverse-proxy"
        ? req.headers.get("x-real-ip")
        : null) || "direct-clinic";
  const key = await hash(scope + ":" + ip);
  const blocked = await mutate((s) => {
    const now = Date.now();
    for (const [k, v] of Object.entries(s.limits))
      if (v.until < now) delete s.limits[k];
    const r = s.limits[key] ?? { count: 0, until: now + 900000 };
    r.count++;
    s.limits[key] = r;
    return r.count > max;
  });
  if (blocked)
    throw new Error("Too many attempts. Please try again in 15 minutes.");
}
