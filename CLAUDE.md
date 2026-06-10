# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CompartoViaje is a BlaBlaCar-style ride-sharing platform for Argentina: Node.js/Express backend, CouchDB database, and a vanilla-JS PWA frontend served by the same process. Payments go through Mercado Pago with manual capture (escrow). All user-facing copy, error messages, and code comments are in **Spanish (rioplatense)** — keep new ones in Spanish. Prices are in ARS.

## Commands

```bash
npm start        # Run the server (serves API + PWA at http://localhost:5004)
npm run dev      # Same, with NODE_ENV=development
npm test         # Smoke tests via node --test backend/test/*.test.js
npm run init-db  # Create CouchDB databases and Mango indexes
npm run seed     # Load demo users (admin/conductor/pasajero) and a trip
```

To run a single test file: `node --test backend/test/smoke.test.js`.

There is no linter, bundler, or build step — the frontend is plain HTML/CSS/ES modules and the backend is CommonJS run directly by Node (>= 18).

Local development expects CouchDB 3.x at `COUCHDB_URL` (default `http://admin:admin@localhost:5984`), e.g. `docker run -d -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=admin couchdb:3`. Copy `.env.example` to `.env` first. The smoke tests do **not** require CouchDB — they only verify modules load and Zod schemas validate. If `MP_ACCESS_TOKEN` is empty, the Mercado Pago client (`mpClient.js`) returns simulated responses, so the full booking/payment flow works offline.

## Architecture

### Backend: Controller → Service → Repository

Each domain lives in `backend/src/modules/<name>/` (users, trips, bookings, payments, reviews, messages, notifications, matching, admin) as a self-contained "logical microservice inside a monolith". Cross-module effects are direct service calls today (designed to be replaceable by an event bus later — see `docs/ARCHITECTURE.md`).

- **Controllers** (`xController.js`): an Express Router exporting routes. They wire `authenticate()` / `requireRole()` (middleware/auth.js), `validate(schema)` (Zod, middleware/validate.js), and `asyncHandler`. They never touch the DB. All controllers are mounted under `/api` in `backend/src/routes.js` — register new controllers there.
- **Services** (`xService.js`): business rules and orchestration. Example: `bookingService.createBooking` reserves seats via tripService, creates the MP preference via paymentService, and enqueues notifications via notificationService.
- **Repositories** (`xRepository.js`): exported as **singleton instances** extending `BaseRepository` (`backend/src/repositories/baseRepository.js`), which provides generic CouchDB CRUD keyed by document `type` and generates IDs with a per-type prefix (e.g. `bkg` for bookings).
- **Schemas** (`xSchema.js`): Zod schemas; `validate()` replaces `req.body` with the parsed result, so defaults/coercions defined in Zod apply.

Errors are typed factories from `backend/src/utils/errors.js` (`BadRequest`, `NotFound`, `Conflict`, etc.); throw them from services and let `middleware/errorHandler.js` shape the JSON response (`{ error: { code, message, details } }`).

### CouchDB

One database per document type, named `<COUCHDB_DB_PREFIX>_<suffix>` (e.g. `compartoviaje_trips`). Every doc carries `type`, `createdAt`, `updatedAt`. Mango indexes are declared centrally in `backend/src/db/couch.js` (`initAll`) — if you add a query on new fields, add the index there and re-run `npm run init-db`. Queries via `BaseRepository.find()` always scope the selector by `type`.

### Payments (Mercado Pago escrow)

The money flow spans modules: booking creation → MP Preference with `marketplace_fee` (platform fee % from `MP_PLATFORM_FEE_PERCENT`) and `external_reference = bookingId` → passenger pays at `init_point` → MP calls `POST /api/payments/webhook`, payment becomes `held` → trip/booking completion triggers `paymentService.release()` (capture) → driver gets paid. Cancellations apply a penalty based on `trip.cancellationPolicy` (`flexible`/`moderate`/`strict`) and issue full or partial refunds. Payment doc statuses: `pending`/`held`/`released`/`refunded`.

### Real-time

`backend/src/ws/wsServer.js` handles `ws://host/ws?token=<accessToken>` and delegates to `notificationService`, which keeps an **in-memory** subscriber map keyed by userId (single-process assumption). Chat messages and notifications are persisted to CouchDB and also pushed over WS (`{ event: "notification" }`, `{ event: "chat.message" }`).

### Frontend PWA (`frontend/pwa/`)

No framework, no build. ES modules under `js/`:

- `router.js` — hash-based router (`#/ruta/:param`); views register with `route()` from `app.js`.
- `api.js` — single `request()` wrapper exposing one named method per backend endpoint; attaches the JWT from `store`. When adding a backend endpoint, add the corresponding method here.
- `store.js` — auth/session state plus IndexedDB cache (trips cache + outbox for offline POSTs).
- `ws.js` — WebSocket client; `ui.js` — shared DOM helpers; `views/` — one module per screen.
- `sw.js` — Service Worker: app-shell cache + stale-while-revalidate for trip searches. **Bump its cache version when changing frontend assets**, or clients keep stale files.

The Express app serves the PWA statically, so frontend changes need no separate dev server.

### Auth and verification rules

JWT access + refresh tokens (refresh payloads carry `kind: "refresh"`). `req.user.sub` is the user ID; roles are `passenger`/`driver`/`admin` (a user can hold several). Drivers cannot publish trips until `verification.identity/license/insurance` are all admin-approved — this gate lives in tripService, and admin moderation endpoints live in the admin module.

## Seed credentials

`npm run seed` creates: admin@compartoviaje.ar / admin1234, conductor@compartoviaje.ar / conductor1234, pasajero@compartoviaje.ar / pasajero1234.
