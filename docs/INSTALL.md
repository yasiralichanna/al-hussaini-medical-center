# Local installation

Requires Node.js 22.13+ (Node 24 tested), pnpm 11, and MongoDB 6+ accessible from the Node host. A local standalone MongoDB server is supported.

1. Extract the source package and enter the project directory.
2. Install dependencies: `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local`. Set `MONGODB_URI`, `MONGODB_DB`, and `SITE_URL`.
4. Start MongoDB using your operating system’s normal MongoDB service. Do not expose its unauthenticated port to the internet.
5. Run `pnpm dev:next` and open `http://localhost:3000`.

The standard Next.js commands use the MongoDB adapter in `server/adapters/active.ts`. The Sites/Vinext commands intentionally use the D1 adapter selected by `vite.config.ts`.

## Secure first administrator

No production username or password is hard-coded and there is no public staff registration.

The CLI reads the password from stdin. On a POSIX shell, export the non-password environment variables and prompt for the password without echoing it:

```sh
export MONGODB_URI='mongodb://127.0.0.1:27017'
export MONGODB_DB='al_hussaini'
export ADMIN_EMAIL='your-clinic-admin@example.com'
export ADMIN_NAME='Clinic administrator'
read -rsp 'New administrator password: ' CLINIC_ADMIN_PASSWORD
printf '%s' "$CLINIC_ADMIN_PASSWORD" | pnpm admin:create
unset CLINIC_ADMIN_PASSWORD
```

Use at least 14 unique characters. The command refuses to create another initial administrator if staff already exist. Sign in at `/admin`, then add receptionist accounts through Staff access.

Alternatively, generate a random `ADMIN_SETUP_SECRET`, set it only on the server, open `/admin`, choose “Initial administrator setup”, and enter the secret plus your chosen email, name and password. The endpoint refuses setup once any staff account exists. Remove the setup environment secret after setup. In the private hosted build, the operator’s separate setup instructions supply this one-time key; it is not in source.

`.env.local` is loaded automatically by Next.js, but shell commands need their environment exported. Never put production secrets in `.env.example`, source control or command arguments.

## Development fixtures

To create availability only in a fresh development database:

```sh
export MONGODB_DB='al_hussaini_dev'
export ALLOW_DEV_SEED='yes'
pnpm seed:dev
```

The command requires a database name ending in `_dev` and refuses production mode. It creates no real patients or passwords. `scripts/prepare-qa.ts` is a separate local Sites QA fixture generator; its output is ignored and must never be deployed.

## Tests

```sh
pnpm test
pnpm typecheck
pnpm build:next
```

## First operational setup

In Services, approve descriptions and enter each service’s duration. In Clinic settings, approve operating days, sessions, slot interval, shared capacity, pending hold duration and change notice. Defaults are operational configuration values awaiting clinic review; they are not claims about the clinic’s actual workflow.
