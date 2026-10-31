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
  if (origin !== new URL(req.url).origin)
    throw new Error("Invalid request origin.");
}
