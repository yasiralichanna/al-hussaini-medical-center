# Clinic launch checklist

## Clinic approval required

- [ ] Confirm **7 PM versus 8 PM** evening closing time. Current 8 PM setting is provisional.
- [ ] Confirm operating days. Production defaults have none enabled.
- [ ] Confirm appointment duration for every service. Production defaults have no durations.
- [ ] Confirm slot interval, shared capacity, pending hold expiry and response workflow.
- [ ] Confirm the clinic contact number and WhatsApp availability. WhatsApp is hidden by default.
- [ ] Verify the exact map location. No unverified map pin is published.
- [ ] Review all English service descriptions. No cures or guaranteed outcomes are promised.
- [ ] Review Urdu and Sindhi translations, including script and terminology. Some technical validation text remains English; approve or commission completion before a fully localized public launch.
- [ ] Preserve qualification wording: **DPT LUMHS & Ultrasonography**. Do not add interpreted qualifications.
- [ ] Add an approved biography if available. Empty biography content is hidden.
- [ ] Add approved real photographs if available. Obtain permission; do not upload identifiable patients or medical records.
- [ ] Review the realistic equipment illustration. It is labeled illustrative and is not a photograph of the actual clinic.
- [ ] Approve scan preparation instructions separately; none are published by default.
- [ ] Review retention, backup rotation, cancellation and rescheduling rules.
- [ ] Confirm the clinic’s actual response process and pending expiry. A received request is not a confirmed visit.

## Technical and operational approval

- [ ] Create the first administrator with the secure CLI or private setup key. Remove `ADMIN_SETUP_SECRET` afterward.
- [ ] Create separate receptionist accounts. Verify no administrator-only access is granted.
- [ ] Choose standard Next.js/MongoDB deployment or explicitly approve the hosted D1 adaptation.
- [ ] Authorize the intended website audience. Current Sites access remains owner-private.
- [ ] Configure HTTPS, database network access, encrypted storage and least-privileged credentials.
- [ ] Run a real database backup and restore drill. Hosted D1 recovery remains unverified.
- [ ] Check aggregate size and expected booking volume. Plan a migration before exceeding documented bounds.
- [ ] Check the 2D presentation on actual iOS/Android devices, including image framing, motion pause/resume and reduced-motion preferences.
- [ ] Verify that booking works independently of images and motion graphics.
- [ ] Complete browser checks of authenticated administrator and receptionist dashboards.
- [ ] Test clinic-approved durations/days using synthetic appointments, then remove test records before accepting patients.
- [ ] If desired, configure an authorized HTTPS email/SMS adapter, verify idempotency and test failure/retry. No messaging credentials are included.
- [ ] Do not label provider acceptance as delivered. Delivery receipt integration is not implemented.
- [ ] Review privacy and appointment policies against actual deployment and operating practices.
- [ ] Keep fees and online payments absent until separately supplied and authorized.
