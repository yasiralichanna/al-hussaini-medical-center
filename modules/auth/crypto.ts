const enc = new TextEncoder();
export function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function hash(s: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function passwordHash(
  password: string,
  salt = token().slice(0, 32),
) {
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    k,
    256,
  );
  return `pbkdf2$100000$${salt}$${Array.from(new Uint8Array(bits), (x) => x.toString(16).padStart(2, "0")).join("")}`;
}
export function constantEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
export async function verifyPassword(p: string, h: string) {
  const parts = h.split("$");
  return (
    parts.length === 4 && constantEqual(await passwordHash(p, parts[2]), h)
  );
}
