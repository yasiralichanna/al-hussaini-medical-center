# Al-Hussaini Medical Center

A Next.js / TypeScript clinic website with realistic illustrative imagery and lightweight 2D motion graphics, private patient management links, appointment scheduling, and session-authenticated staff administration.

The clinic facts come from the supplied brief. Production defaults intentionally contain **no bookable working days or service durations**. Online scheduling stays closed until approved values are entered. No fake patients, reviews, experience claims, medical credentials, fees, map coordinates or WhatsApp availability are published.

## Start here

- [Local installation and initial administrator](docs/INSTALL.md)
- [Production deployment](docs/DEPLOYMENT.md)
- [Architecture and concurrency](docs/ARCHITECTURE.md)
- [Backup, restore and operations](docs/OPERATIONS.md)
- [Launch checklist](docs/LAUNCH_CHECKLIST.md)
- [Tests and verification limits](docs/TEST_RESULTS.md)
- [Assets and licenses](docs/ASSET_LICENSES.md)

## Two deployment targets

1. **Standard Next.js + MongoDB:** `pnpm dev:next`, `pnpm build:next`, `pnpm start:next`. Supports local MongoDB and deployment connections. The scheduling aggregate uses one atomic compare-and-swap, so MongoDB replica sets are not required.
2. **Private Sites hosting:** Vinext builds the same App Router application for the Sites Worker. This target uses a durable D1 adapter because Workers cannot connect to a local MongoDB server over raw TCP. Only the persistence adapter changes; business logic, validation, password authentication and staff permissions are shared. This is an explicit hosting adaptation, not an assertion that the hosted site uses MongoDB.

The current private website is accessible only to its owner through Sites. Staff accounts are a second, separate authorization layer. Additional receptionists need website audience access or a standard Node deployment before they can reach the login page; the project does not silently make patient scheduling publicly accessible.

## Modules

```text
app/                       App Router pages and server API
modules/clinic/            Public interface, clinic types, shared fetch client
modules/bookings/          Schemas, availability, atomic booking operations, management UI
modules/auth/              Hashing, session resolution, role policy
modules/admin/             Staff dashboard and content management
modules/localization/      English, Urdu, Sindhi and RTL context
modules/clinic/CareVisual   Responsive imagery, decorative SVG motion and pause controls
server/                    Business persistence boundary, CSRF, rate limits, notifications
server/adapters/            MongoDB and hosted D1 adapters
scripts/                   Admin setup, development-only fixtures, retention
/tests/                    Scheduling, concurrency and authorization tests
/docs/                     Installation, deployment, operations and verification
```

## Implemented behavior

- Three public languages, persistent device language preference, Urdu/Sindhi RTL and mixed-direction time/phone display.
- Address-based directions and click-to-call; optional WhatsApp link appears only after staff approval.
- Five supplied service categories with booking preselection; approved biography and clinic photographs are editable.
- Booking form, server slots, Pakistan mobile normalization, Karachi dates, shared capacity, overlapping durations, closures and pending expiry.
- Idempotency keys plus confidential management tokens; only token hashes persist in records.
- Review before submission, clearly pending receipts, cancellation and rescheduling.
- Staff password hashing, HTTP-only sessions, role enforcement, invalidated logout, audit metadata and rate limits.
- Appointment filters, all required statuses, valid transitions, staff-created phone/walk-in appointments, restricted notes, enquiries and retention controls.
- Responsive realistic ultrasound illustration, subtle image movement, animated decorative SVG lines and a 2D service guide.
- Pause/resume controls and reduced-motion support. No canvas, 3D scene, WebGL or 3D dependencies are loaded.
- Optional idempotent HTTPS notification webhook; persisted requests never depend on messaging success.

## Current boundaries

- The former 3D experience has been replaced with 2D images and motion graphics. No WebGL-capable browser is required.
- Physical iOS/Android browsers and authenticated staff dashboard UI were not exercised in this environment. Authorization policies and scheduling logic have automated tests; patient request/reschedule/cancel flows were checked in the browser against a separate local development database.
- Clinical wording and Urdu/Sindhi translation drafts require clinic review. Admin operations currently use English; the patient navigation, booking forms, statuses and management controls have translated strings. Some server validation/provider messages remain English.
- No messaging provider, exact map pin, WhatsApp confirmation, approved biography, real photos, operating days, durations or fees are preconfigured.
- No delivery receipt callback exists; webhook HTTP acceptance is recorded as `provider_accepted`, never `delivered`.
- Storage is intentionally bounded for a small clinic. See architecture limits before scaling. This is scheduling software, not an EMR, emergency service, diagnosis or online consultation.

Run `pnpm test` and `pnpm typecheck` before making changes. Do not seed development availability into production.
