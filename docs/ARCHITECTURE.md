# Architecture and concurrent scheduling

## Request boundary

Public App Router pages render independent HTML contact/booking controls. The 2D presentation uses a responsive equipment image and decorative SVG motion. It never serves as the booking database. `/api/clinic` validates every operation with Zod and invokes business functions. Browser data is untrusted. Mutations require an exact same-origin `Origin` header; session cookies are HTTP-only, SameSite Strict, path `/`, and Secure on HTTPS.

Public booking and enquiries require no patient account. Staff sessions are random 256-bit tokens, stored only as SHA-256 hashes in the database. Sessions expire after eight hours; logout removes the current hash. Active staff membership and role are resolved on every protected request. Administrator settings, staff creation and retention are server-protected. The initial setup endpoint requires a server-side random secret and atomically checks that the staff list is empty.

Passwords use random salts and Web Crypto PBKDF2 SHA-256 with 100,000 iterations, compatible with the hosted Worker’s native Web Crypto limit. Password length is 14–200 for setup and staff creation; online login is rate-limited. For deployments with stronger password-KDF policy requirements, upgrade the hashing adapter and migrate hashes before launch; this implementation does not claim an external security certification.

## Data models

`modules/clinic/types.ts` defines Staff, Session, Service, Appointment, Settings/availability, blocked periods, Enquiry, Audit and notification records. They are persisted in one bounded clinic scheduling aggregate, versioned by a monotonic revision.

- MongoDB: `clinic_state` collection, document `_id: clinic`.
- D1 hosting: migration-owned `clinic_state(id, revision, data)` row.
- The MongoDB `_id` and D1 primary key are unique. First-write insertion races are handled.
- Test fixtures are kept outside production and excluded from source archives and deployment output.

## Atomic capacity enforcement

The `atomic` service reads a snapshot and revision, clones it, validates the requested operation, then performs one database compare-and-swap. The update succeeds only when the stored revision still equals the snapshot revision. A conflict retries the entire business function against a fresh snapshot. Consequently, availability checks, pending expiry, idempotency lookup, appointment write and capacity consumption share one atomic commit.

This design avoids cross-document transactions and works with **standalone MongoDB**. Both adapters implement the same revision contract. It is deliberately a small-clinic design, not a horizontally scaled hospital EMR.

For each candidate start time, the algorithm requires:

- An active service with a configured duration.
- Approved working day and a date within 90 days.
- A future instant interpreted with `+05:00` / Asia/Karachi.
- The full visit duration inside a configured session.
- No overlap with a whole-day or partial closure.
- Peak concurrent occupancy below shared clinic capacity across all services.

Confirmed records consume capacity. Pending records consume capacity until `holdUntil`. Expired pending records are ignored immediately by availability and normalized to cancelled on the next relevant mutation. Cancellation and rescheduling release old capacity atomically. Changing staff configuration does not silently cancel existing appointments; staff must review affected visits.

Idempotent retries must carry the same request UUID, exact normalized payload and private management token. The service returns the existing appointment; altered payload/token combinations are rejected. Public references are display identifiers only. Patient management requires the unguessable 256-bit token, validated against its stored hash. Tokens travel in the URL fragment and are then removed from the address bar; API access uses POST and `Cache-Control: no-store`. No analytics are installed. Refreshing a management page after the fragment is cleared requires reopening the original private link.

## Limits and retention

MongoDB aggregate commits are limited to 10 MB by application code, below MongoDB’s document limit. D1 has lower provider row/request limits; monitor aggregate size well before approaching 1.5 MB in the hosted adaptation. Use smaller approved photos and routine retention. The hosted adapter refuses aggregate data above 1.5 MB before writing. Large clinics should migrate to per-record collections and transactional capacity ledgers on a MongoDB replica set; do not simply remove the size limits.

All aggregate writes serialize by revision. It is correct for concurrent capacity enforcement, but contention increases as volume grows. Rate limit counters are shared in storage, pruned after 15 minutes. Public booking has 20 requests / 15 minutes per trusted IP, enquiries 8, login 8, management 60, setup 5. The limits apply across processes, with normal limitations for shared NAT clients.

Records include names, mobile numbers and optional scheduling notes. They are not encrypted by application code at rest; configure provider disk encryption, encrypted backups, network TLS and database permissions. Never collect medical records through this app.

## 2D imagery and motion graphics

The public website uses the realistic equipment illustration in `public/ultrasound-illustration.webp`, positioned in a responsive HTML image container. It is clearly labeled as illustrative and is not presented as a photograph of the real clinic.

`modules/clinic/CareVisual.tsx` supplies a subtle image drift, a decorative SVG line animation and an explicit pause/resume control. CSS respects `prefers-reduced-motion` and the animation contains no diagnostic simulation or patient data. A 2D care guide presents each active service with a description and an appointment action that preselects that service.

The former Three.js scene, walkthrough, camera/hotspot controls and rendering dependencies have been removed. `/virtual` remains as a backward-compatible route to the 2D care guide. Contact information, booking, private management links and secure administration use the same server services as before.
