# Production deployment

## Standard Next.js + MongoDB (requested stack)

Use a Node-capable server or platform supporting Next.js App Router and a MongoDB network connection. Configure:

- Node 22.13+.
- `MONGODB_URI` with database credentials, TLS and a restricted network allowlist.
- `MONGODB_DB=al_hussaini` or another production name.
- `SITE_URL` set to your actual HTTPS origin.
- Optional one-time `ADMIN_SETUP_SECRET`, removed after first administrator creation.
- Optional notification webhook secrets, only after provider validation.

Install with `pnpm install --frozen-lockfile`, build with `pnpm build:next`, and start with `pnpm start:next`. Put HTTPS in front of the service. Preserve the original host/protocol when proxying so same-origin CSRF checks and Secure cookies work correctly. Do not allow cross-origin credentialed API requests. Do not cache staff or management responses.

The standard Next.js build uses MongoDB directly. No Cloudflare account or D1 is required. A standalone local MongoDB works because all scheduling changes commit as one atomic document update.

For a process supervisor, use your platform’s normal Node process lifecycle. Set memory and request limits, watch application health without logging patient payloads, and configure private backups. Before exposing the site to patients, complete the launch checklist and test a request and staff confirmation using clearly synthetic data.

## Existing private Sites build

The repository retains `.openai/hosting.json` and the Sites build integration. The native Sites publishing workflow packages the Vinext Worker and applies the tracked Drizzle schema migration. D1 is provisioned durably by Sites and is **not MongoDB**. The Vite alias replaces only `server/adapters/active.ts` with the D1 implementation. The hosting-specific configuration does not affect `next build`.

Use Sites tools for runtime secrets and publishing. Do not put secret values in the manifest. The private deployment requires the owner’s ChatGPT access in addition to the clinic staff password. Do not change the audience simply to make a login test easier. To operate with other staff or patients, explicitly authorize the intended website audience or deploy the standard Next.js/MongoDB target.

Local D1 and production D1 are separate. Never upload `.wrangler/`, `.sites-runtime/`, `outputs/`, `.env.local`, QA credentials, QA databases or development seed data.

## Optional email/SMS integration

Set `NOTIFICATION_WEBHOOK_URL` to an authorized HTTPS adapter endpoint and `NOTIFICATION_WEBHOOK_TOKEN` as a server secret. The adapter must honor the stable `Idempotency-Key` header and map the scheduling payload to an authorized email/SMS provider. It must not log or forward unnecessary patient data. No patient medical notes are sent.

Use Operations → Notifications → Send / retry after provider setup. A short lease prevents overlapping attempts; retries retain the same idempotency key. Failed dispatch does not undo a saved appointment. HTTP 2xx yields `provider_accepted`, not confirmed delivery. A provider delivery callback is not implemented. No provider-specific credentials or messaging subscription are included.

A WhatsApp enquiry link can be enabled separately only after the clinic confirms its number supports WhatsApp. Automated WhatsApp requires an authorized provider integration; the generic webhook is not a claim that WhatsApp messaging is authorized.

## Trusted proxy IP handling

The default `TRUST_PROXY_IP=none` ignores user-supplied IP headers and shares a conservative global public-form limit. On Sites, `cloudflare` trusts the provider-overwritten `CF-Connecting-IP` header. On a standard Node deployment behind your own proxy, set `reverse-proxy` only after configuring the proxy to overwrite `X-Real-IP` and blocking direct public access to the Node origin. Never forward a visitor-provided trusted-IP header unchanged.
