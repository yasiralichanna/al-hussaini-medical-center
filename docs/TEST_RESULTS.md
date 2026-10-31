# Verification report — 2D redesign

Updated: 27 October 2026 (Asia/Karachi).

## Current change

The former WebGL/3D presentation is replaced by realistic illustrative imagery and lightweight 2D motion graphics. Three.js, React Three Fiber and Drei are removed. The legacy `/virtual` route opens the new 2D care guide. Scheduling, database persistence, staff authentication and authorization logic are unchanged.

Source type-check and production build results, plus browser checks of the redesigned interface, are recorded with the delivered version. Motion respects reduced-motion preferences and can be paused explicitly.

## Existing scheduling verification

The 19-test scheduling/authentication suite covers validation, mobile normalization, private token checks, cancellation/rescheduling, pending expiry, overlapping durations, saved duration after configuration changes, 100 competing requests against capacity 1, 20 duplicate retries, session expiry/logout and administrator permissions. The concurrency tests use the actual scheduling service with an asynchronous compare-and-swap adapter, not a claimed production database load test.

The previous browser run verified a saved pending request, private management link, rescheduling, cancellation, a saved enquiry, Urdu/Sindhi rendering and rejection of anonymous dashboard access against a separate local development database. No synthetic patient records are included in production.

## Remaining limits

Physical iOS/Android devices, authenticated staff screens, live MongoDB runtime integration, external messaging providers and production D1 backup/restore were not available for acceptance testing. Clinical content and translations still need clinic review. The website remains owner-private and online availability stays closed until approved days and service durations are configured. No fees, exact map coordinates or WhatsApp availability have been invented.

## 2D browser checks completed

- Realistic equipment image loads with an illustrative-image label.
- Pause changes to Resume and pauses the CSS image/line animations.
- The new care guide opens and switches between service descriptions.
- Selecting Physiotherapy and booking opens the existing real form with Physiotherapy preselected.
- Public navigation retains contact actions and the three language options.
- No canvas renderer or 3D controls are present in the redesigned public interface.

## Booking configuration correction

The production public settings were inspected read-only: operating days and sessions had been saved, but every service duration was null. This explained both the call-only public booking and empty staff time selector.

The fix adds service durations directly to Clinic settings, saves hours and durations atomically, refreshes public settings whenever booking opens or a tab regains focus, and provides loading/error/empty availability explanations. Staff time selection is controlled and resets when the date/service changes; confirmation becomes enabled only after a real slot is selected. No production durations were invented or changed.

26 automated tests passed, including seven new regression cases for readiness, settings-plus-duration saves, preservation of configured hours, rejection of partial invalid updates, explicit empty-slot reasons, confirmed staff bookings and valid pending-to-confirmed transitions.

Browser checks on local synthetic fixtures confirmed that staff time selection enables Confirm and submits to the authenticated endpoint (unauthenticated attempts are rejected), and that changing a local duration then refreshing availability unlocks public booking and selectable times without a page reload. Authenticated production booking creation was not performed; no real patient records were created. The temporary development UI harness was removed before publication.
