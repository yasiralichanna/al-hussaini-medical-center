import { z } from "zod";
export function normalizePhone(raw: string) {
  const s = raw.replace(/[\s()-]/g, "");
  if (/^03\d{9}$/.test(s)) return "+92" + s.slice(1);
  if (/^923\d{9}$/.test(s)) return "+" + s;
  if (/^\+923\d{9}$/.test(s)) return s;
  throw new Error(
    "Enter a valid Pakistan mobile number, for example 03003032956.",
  );
}
export const mobile = z
  .string()
  .max(30)
  .transform((s, ctx) => {
    try {
      return normalizePhone(s);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid Pakistan mobile number.",
      });
      return z.NEVER;
    }
  });
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) => !isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s),
    "Invalid date",
  );
export const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const bookingSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: mobile,
  service: z.string().min(1).max(80),
  date,
  time,
  note: z.string().trim().max(500).default(""),
  consent: z.literal(true),
  idempotency: z.string().uuid(),
});
export const enquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: mobile,
  message: z.string().trim().min(5).max(1000),
  consent: z.literal(true),
});
const photo = z.object({
  id: z.string().uuid(),
  alt: z.string().trim().min(5).max(200),
  data: z
    .string()
    .max(720000)
    .refine((value) => {
      try {
        const match = value.match(
          /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/,
        );
        if (!match) return false;
        const bytes = atob(match[2]);
        if (bytes.length > 524288) return false;
        return match[1] === "png"
          ? bytes.startsWith("\x89PNG\r\n\x1a\n")
          : match[1] === "jpeg"
            ? bytes.startsWith("\xff\xd8\xff")
            : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
      } catch {
        return false;
      }
    }, "Use a PNG, JPEG or WebP image under 512 KB."),
});
export const settingsSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).max(7),
  sessions: z
    .array(z.object({ start: time, end: time }).refine((v) => v.start < v.end))
    .min(1)
    .max(4),
  interval: z.number().int().min(5).max(120),
  capacity: z.number().int().min(1).max(20),
  holdMinutes: z.number().int().min(5).max(10080),
  cancellationHours: z.number().int().min(0).max(168),
  retentionDays: z.number().int().min(7).max(3650),
  blocked: z
    .array(
      z
        .object({ date, start: time.optional(), end: time.optional() })
        .refine(
          (v) =>
            (!v.start && !v.end) || (!!v.start && !!v.end && v.start < v.end),
        ),
    )
    .max(1000),
  phone: mobile,
  address: z.string().trim().min(5).max(300),
  bio: z.string().max(2000),
  whatsapp: z.boolean(),
  eveningProvisional: z.boolean(),
  photos: z.array(photo).max(3),
});
export const serviceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  name: z.string().min(2).max(100),
  description: z.string().min(5).max(1000),
  duration: z.number().int().min(5).max(240).nullable(),
  active: z.boolean(),
});
