import { resolveStaff } from "../modules/auth/permissions";
import { cookies } from "next/headers";
import { readState } from "./store";
import { hash } from "../modules/auth/crypto";
export async function staffSession() {
  const raw = (await cookies()).get("clinic_session")?.value;
  if (!raw) return null;
  const s = await readState();
  const h = await hash(raw);
  return resolveStaff(s, h);
}
export function assertOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) throw new Error("Invalid request origin.");
  // Behind reverse proxies (Render, Cloudflare, etc.) req.url is localhost.
  // Use SITE_URL first, then reconstruct from forwarded headers, then req.url.
  const siteUrl = process.env.SITE_URL;
  if (siteUrl && origin === new URL(siteUrl).origin) return;
  const fwdProto = req.headers.get("x-forwarded-proto");
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (fwdProto && fwdHost) {
    const reconstructed = `${fwdProto}://${fwdHost}`;
    if (origin === new URL(reconstructed).origin) return;
  }
  if (origin === new URL(req.url).origin) return;
  throw new Error("Invalid request origin.");
}
