# Operations, backup and restore

## Daily reception workflow

Sign in at `/admin`. Review pending requests, call patients to confirm, and update appointment status. Pending never means confirmed. Use date/service/status filters, phone links and restricted scheduling notes. Record phone bookings with the patient’s consent; they create confirmed appointments but still pass the same capacity and working-hours rules. Walk-ins can use the next configured available time; the app does not backdate visits or bypass capacity.

Review new enquiries and mark them resolved after responding. Do not enter medical records or diagnostic details into public notes or internal scheduling notes. Administrator-only audit events contain actor/action/target/time without copying patient names or notes.

After changing hours, durations, capacity or closures, review affected existing appointments. The app does not cancel them automatically. Check the closing-time discrepancy with the clinic before changing its provisional flag.

## MongoDB backup

Use MongoDB Database Tools. Set the authenticated URI in your process environment; avoid command-line passwords. Restrict backup directory permissions and encrypt backups at rest. A minimal backup example uses the URI’s environment expansion; on multi-user systems use a protected Database Tools configuration file instead of exposing credentials in process arguments.

```sh
mongodump --uri="$MONGODB_URI" --db="$MONGODB_DB" --archive=clinic-backup.archive --gzip
```

Store daily encrypted backups separately from the running database and source repository. Rotate backups according to the clinic’s approved retention policy. Backups contain patient information and staff password/session hashes; never upload them to a public file service or include them in a source ZIP.

Restore into a **separate validation database** first, inspect counts and scheduling settings, and invalidate all sessions before allowing staff access. Example:

```sh
mongorestore --uri="$MONGODB_URI" --archive=clinic-backup.archive --gzip --nsFrom='al_hussaini.*' --nsTo='al_hussaini_restore.*'
```

Verify the restored `clinic_state` document and revision. Schedule a maintenance window and take a fresh backup before replacing a production database. The app intentionally does not provide a public import/export endpoint. Use least-privileged database operator access.

## Hosted D1 backup

Sites owns the production D1 binding; local Wrangler configuration uses a placeholder database ID and cannot back up production. Use the hosting provider’s authorized database backup/export or support workflow and verify actual restore access before public launch. A working production D1 backup/restore drill was **not available in this environment**. This is a launch blocker for treating the hosted adaptation as the clinic’s primary operational database.

For local development only, export using Wrangler with the local generated `dist/server/wrangler.json` and `.wrangler/state`. This does not back up the hosted website.

## Retention and erasure

The default retention configuration is 180 days, awaiting clinic approval. Retention is manual, not automatic: Operations → Run retention cleanup, or on standard MongoDB deployment `APPLY_RETENTION=yes pnpm retention`. It removes eligible old inactive appointments and resolved enquiries, expired sessions and orphaned notifications; active appointments and unresolved enquiries remain. Older audit records are also removed.

For a patient-specific deletion request, an authorized administrator must verify the requester using clinic procedures, then the database operator can remove the record and associated notifications under maintenance. There is no unverified public deletion endpoint. Remove copies from backup rotation according to approved policy. These procedures require the clinic’s legal/privacy review; the app does not assert legal compliance certification.

## Recovery and access

If a staff account is compromised, deactivate it using another administrator; sessions for it are removed immediately. Expired sessions cannot regain access. For lost administrator access, use a database operator to replace a password hash through the same hashing function and invalidate sessions; do not add a public password-reset bypass. Never hard-code a recovery password.

If messaging fails, appointment records remain saved. Call patients directly. Retry a configured provider using the same notification idempotency key. Monitor aggregate size and apply retention well before the D1/Mongo document limits.
