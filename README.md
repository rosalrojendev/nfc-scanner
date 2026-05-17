# Anchor Tag Pro

A multi-tenant SaaS for **roof-anchor field inspection**. Built mobile-first, runs comfortably on desktop, and ships with a real Postgres backend, cloud file storage, NFC + QR scanning, and a polished PDF reporting pipeline.

> Live demo: run `npm run dev` and visit <http://localhost:3000>.

---

## Tech stack

| Concern             | Choice                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------- |
| Framework           | **Next.js 16** (App Router, React 19, TypeScript, Turbopack)                            |
| Styling             | **Tailwind CSS v4** with CSS variables for the design tokens (light/dark + brand palettes) |
| UI primitives       | Hand-rolled shadcn-style components in `components/ui/*` (`class-variance-authority`, `tailwind-merge`) |
| Forms / validation  | **Zod** — schemas shared between client and server                                      |
| Auth                | `bcryptjs` (password hashing) + **jose** (JWT) in HTTP-only cookies + Next middleware    |
| **Database**        | **Postgres on Neon** via **Prisma 7** (`@prisma/adapter-neon` for serverless pools)     |
| **File storage**    | **UploadThing** for photos, signatures, and drawing attachments                          |
| **PDF generation**  | **`@react-pdf/renderer`** — full inspection reports and 75×50 mm engraving plates       |
| **QR generation**   | **`qrcode`** — per-anchor codes with H-level error correction                            |
| QR scanning         | `jsqr` against a `<canvas>` from a `getUserMedia` stream or uploaded image              |
| NFC scanning + write | `Web NFC` (`NDEFReader`) on supported devices (Chrome on Android over HTTPS)           |
| Icons               | `lucide-react` + one custom SVG (`AnchorTagIcon`)                                       |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database (Neon)

1. Create a free Postgres database at <https://console.neon.tech>.
2. Grab two connection strings from the dashboard:
   - **Pooled** (`-pooler.neon.tech` in the host) → `DATABASE_URL`
   - **Direct** (no `-pooler`) → `DIRECT_DATABASE_URL`

### 3. Set up UploadThing

1. Create an app at <https://uploadthing.com>.
2. Copy the single **token** from the API Keys page → `UPLOADTHING_TOKEN`.

### 4. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

```dotenv
AUTH_SECRET=<openssl rand -base64 48>
DATABASE_URL=postgresql://...-pooler.region.aws.neon.tech/db?sslmode=require
DIRECT_DATABASE_URL=postgresql://....region.aws.neon.tech/db?sslmode=require
UPLOADTHING_TOKEN=<from UploadThing dashboard>
```

### 5. Migrate and seed

```bash
npm run db:migrate    # applies the Prisma schema to your Neon DB
npm run db:seed       # writes demo users, clients, projects, anchors, inspections, drawings
```

### 6. Run the dev server

```bash
npm run dev
# open http://localhost:3000
```

### Production build

```bash
npm run build      # runs `prisma generate` then `next build`
npm start
```

### Demo credentials

After seeding, three users exist (all bcrypt-hashed, shared password):

| Role      | Email                              | Passcode         | What they can do                                                  |
| --------- | ---------------------------------- | ---------------- | ----------------------------------------------------------------- |
| Inspector | `kamata@kamloopsropeaccess.com`    | `AnchorTag!2026` | Scan, log/edit/delete inspections, create/edit/delete anchors    |
| Admin     | `admin@kamloopsropeaccess.com`     | `AnchorTag!2026` | Everything, plus tenancy management                              |
| Client    | `client@anchorclient.com`          | `AnchorTag!2026` | Read-only on anchors + inspections; can manage roster, drawings, reports |

The **"Try demo bypass"** button on the login page issues a session for the currently selected role without typing credentials.

---

## What's implemented

### Auth & multi-tenancy

- **Real signup + login** with bcrypt-hashed passwords, JWT sessions in `HttpOnly` `SameSite=Lax` cookies, 8-hour TTL, IP-based rate limiting (8/min) on login and signup.
- **Three global roles** (`admin` / `client` / `inspector`) plus per-client **memberships** (`admin` / `member`) for tenant-scoped admin rights.
- **Tenancy** model — `Client → Project → (Anchors, Buildings, Drawings, Inspections)`. Anchors and inspections are scoped to projects; the user only sees what their memberships allow.
- **Confirm dialogs** on logout (centered modal) and destructive actions.

### Anchors

- List page with full-text search, status filter, building filter, configurable sort.
- Detail page with metadata, inspection history, NFC writer card, **QR plate** card, edit dialog (label, building, location, drawing, **NFC chip serial**), and a **soft-delete** flow with type-the-ID confirmation.
- **Soft delete** — `deletedAt` / `deletedBy` columns; deleted records still surface in the activity feed.

### Inspections

- Full form with photo upload (UploadThing), canvas signature pad (touch/mouse/stylus), Zod-validated input, inspector picker scoped to the current project's client + deduped by userId.
- **Defaults to the signed-in user** when an inspector logs an inspection.
- After save, redirects to `/inspections` (new) or back to the anchor detail (edit).
- Cascades onto the parent anchor: `lastTested`, `nextDue`, `status`, `inspector`, `proofResult`.
- **Soft delete** with the same `deletedAt` audit trail as anchors.

### Drawings

- Upload roof plans (admin/client) — PNG/JPG up to 16 MB or PDF up to 32 MB.
- **Pin anchors** onto the plan (any role with `pinDrawing`).
- **Download with pins / Download original** split-button — composites pin markers + IDs onto the original at native resolution and ships a PNG. Available to admin/client/inspector when an image plan is uploaded.
- Detail-sheet and PDF attachments.

### Scanning

- **NFC read + write** — `NDEFReader` reads tag payloads and writes URL records by default (NTAG213-friendly) with optional MIME metadata snapshot (`application/vnd.atp.tag+json`). After a successful write, prompts the user to record the chip's serial number against the anchor.
- **QR via camera** — `getUserMedia` + `jsqr`. Three resolution strategies: bare ID, URL with the ID as the last path segment, or substring fallback.
- **QR via image upload** — same decoder against a file.
- **Per-anchor QR generator** with downloads:
  - **PNG / SVG** with H-level (30 %) error correction.
  - **Quick print** — auto-print template for paper backups.
  - **Plate PDF (75 × 50 mm)** — exact-size, engrave-ready layout (anchor ID + location + QR + NFC N-mark + "Do not paint" warning) for anodized-aluminum tags.
- **iOS detection** — iPhone surfaces the QR / manual tabs and hides the NFC tab gracefully (Web NFC is Android-only).

### Reports

- **Dynamic per-building snapshot reports** + one **full inspection log** per project, derived from live anchor/inspection data.
- Status badges computed from the data (`Awaiting inspections` / `Needs review` / `Ready`).
- **PDF export** via `@react-pdf/renderer` — branded multi-page document with a sticky header, stats row, anchor registry table, recent-inspections table, and footer with page numbers.
- **CSV export** scoped to each report.
- **Email client** — generates the PDF, downloads it, then opens the user's mail client with a pre-filled subject + body that instructs them to attach the just-downloaded file. No email provider required.

### Dashboard

- Role-aware hero card.
- Animated counters for buildings / inspectors / overdue / reports ready.
- Re-test queue (anchors due in ≤ 60 days) with status pills.
- **Recent events feed** that merges three streams: inspection results (created), inspection deletions, and anchor deletions. Each row links to the anchor.
- **Reminder banner** driven by the user's 60/30/7-day toggles in Settings — surfaces overdue anchors always, plus upcoming ones within the longest enabled window.
- Skeleton loading states for stats, due list, and events while the store bootstraps.

### Settings

- Profile (edit name/email/password), avatar upload.
- Roster management (inspectors).
- Reminders (60/30/7-day toggles).
- **Share report links** — tokenized `/share/[id]` public read-only pages, no auth required, indexed-as-no-follow.
- Buildings management (rename cascades to anchors + drawings).
- **Tenancy** moved out of Settings into its own `/tenancy` route (admin only) with its own nav slot.
- **Appearance** — light/dark toggle and a **brand palette** switch (Anchor steel-teal vs KRA classic warm-cream + orange).

### Project switching

- Project picker in the topbar with per-client groupings.
- Switching projects triggers refetches across the stores and surfaces the global loader so the user has a clear "the page is changing" affordance.

### Notifications & loading

- Centered overlay loader (anchored within the main content region, not the full viewport) for the global fetch indicator.
- Toast system for success/error feedback.
- Skeleton placeholders for counts and lists so users don't see "0" while data is in flight.

---

## Roles & permissions

| Capability                      | Admin | Client | Inspector |
| ------------------------------- | :---: | :----: | :-------: |
| View all pages                  |  ✅   |   ✅    |    ✅     |
| Edit / create anchors           |  ✅   |   ✅    |    ✅     |
| Delete anchors (soft)           |  ✅   |   —    |    ✅     |
| Log / edit inspections          |  ✅   |   —    |    ✅     |
| Delete inspections (soft)       |  ✅   |   —    |    ✅     |
| Scan NFC / QR, write NFC tags   |  ✅   |   ✅    |    ✅     |
| Upload drawings                 |  ✅   |   ✅    |    —      |
| Pin anchors on drawings         |  ✅   |   —    |    ✅     |
| Download drawings with/without pins |  ✅ |  ✅    |    ✅     |
| Export / email reports          |  ✅   |   ✅    |    —      |
| Manage user roster              |  ✅   |   ✅    |    —      |
| Manage tenancy (clients/projects/memberships) |  ✅   |  — |  —  |
| Reset server store              |  ✅   |   —    |    —      |

Permissions live in [`lib/permissions.ts`](lib/permissions.ts) and are enforced on **both** the client UI gate and the server API route.

---

## Security

- **Password storage** — bcrypt cost 10. Plaintext is never persisted.
- **Sessions** — short-lived (8 h) JWTs signed with HS256 via `jose`, set as `HttpOnly`, `Secure` (in prod), `SameSite=Lax`, `Path=/`. Middleware verifies the JWT on every protected route.
- **CSRF** — `SameSite=Lax` + same-origin `fetch` calls. No third-party iframes/forms.
- **Validation** — every API input goes through a Zod schema on the server.
- **Rate limits** — in-memory per-IP token bucket on `/api/auth/login` and `/api/auth/signup` (8/min). Not on `/api/auth/demo` yet; replace with Upstash Redis ratelimit for horizontal scaling.
- **Soft delete** — destructive actions leave audit rows behind.
- **Type-to-confirm delete** for anchors.
- **Headers** (configured in `next.config.ts`) — CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS in production, and a `Permissions-Policy` that scopes the camera + NFC APIs to first-party only.
- **Share links** — tokenized cuids, `robots: noindex/nofollow` on the public page, read-only access by design.
- **File uploads** — go to UploadThing (auth-gated middleware), MIME-checked, size-capped per route.

---

## Project structure

```
app/
  layout.tsx                  Root layout, theme + palette boot, toast provider
  page.tsx                    Redirects to /login or /dashboard
  globals.css                 Tailwind v4 + design tokens (light/dark × Anchor/KRA palettes)
  login/                      Sign-in screen (server + client split)
  signup/                     Signup (Inspector / Company admin)
  share/[id]/                 Public tokenized read-only project view
  api/
    auth/                     login | signup | logout | demo
    anchors/                  GET/POST + [id] GET/PATCH/DELETE
    inspections/              GET/POST + [id] GET/PATCH/DELETE
    drawings/                 GET/POST + [id] DELETE + pins + attachments
    buildings/                GET/POST + [id] PATCH/DELETE
    inspectors/               GET/POST + [id] PATCH/DELETE
    share-links/              GET/POST + [id] DELETE
    tenants/                  Clients, projects, memberships (admin only)
    me/                       Current user prefs + current-project setter
    uploadthing/              UploadThing route handler (photos, signatures, plans)
    admin/                    reset-to-seed (admin only)
  (app)/                      Authenticated app shell
    layout.tsx                Top bar + side nav + bottom nav + global loader
    dashboard/                Hero, reminder banner, stats, due list, activity feed
    anchors/                  list + [id] detail with QR plate + NFC + soft-delete
    inspections/              list with filters + new (form, edit, photos, signature)
    scan/                     NFC + QR + manual + demo bypass
    drawings/                 plans, clickable pins, attachments, download with pins
    reports/                  per-building + full-project + PDF + CSV + mailto
    settings/                 profile, roster, reminders, buildings, palette, appearance
    tenancy/                  clients + projects + memberships (admin only)
components/
  ui/                         Button, Card, Input, Badge, Dialog, Segmented, Toast, Empty
  shell/                      TopBar, SideNav, BottomNav, ThemeToggle, PaletteToggle,
                              ProjectSwitcher, SessionProvider, ProjectProvider,
                              GlobalLoader, ClimbingLoader
  scan/                       qr-scanner, nfc-scanner, nfc-writer
  inspection/                 photo-upload, signature-pad, inspector-picker
  anchors/                    anchor-qr-panel, anchor-plate-pdf, new-anchor-dialog
  drawings/                   pin-anchor-dialog, upload-drawing-dialog
  reports/                    report-pdf (multi-page branded PDF)
  settings/                   manage-users-dialog, manage-buildings-dialog,
                              tenancy-manager, share-link-dialog, reminders-dialog,
                              edit-profile-dialog, my-profile-photo
  icons/                      anchor-tag-icon (custom hanging-anchor mark)
lib/
  auth.ts                     bcrypt + jose helpers (server-only)
  permissions.ts              Role-based capability matrix
  server-store.ts             Prisma adapters for every domain object
  store.ts                    Client-side store with reactive caches (anchors, inspections)
                              + soft-delete handling + parallel useAllX hooks
  buildings-store.ts          /api/buildings client cache
  drawings-store.ts           /api/drawings client cache
  settings-store.ts           User prefs, reminders, share links, inspectors
  loading-state.ts            useIsFetching for the global loader
  nfc-payload.ts              JSON payload + buildTagUrl for NFC writes
  scan.ts                     resolveScanPayload (3-strategy matcher)
  validation.ts               Zod schemas, including anchor patch with nfcTag
  types.ts                    Shared TS types
  utils.ts                    cn, formatDate, daysUntil, uid, timestampFilename
  seed.ts                     Static seed data
  db-seed.ts                  Prisma-backed seeder
prisma/
  schema.prisma               User, Client, Project, Membership, Anchor (soft-delete),
                              Inspection (soft-delete), Drawing, DrawingPin,
                              DrawingAttachment, Inspector, ShareLink, Building
  seed.ts                     CLI seed entry (npm run db:seed)
middleware.ts                 Auth gate; opens /login, /signup, /share/*, /api/auth/*,
                              /api/uploadthing
next.config.ts                Security headers
```

---

## Suggested next steps

These are obvious wins that didn't land in this pass, ordered roughly by impact and effort:

### Quality of life

1. **Batch plate export** — on the Anchors list page, a "Download plates" button that produces a single multi-page PDF with one engraving-ready plate per anchor (filterable by building first). Same `AnchorPlatePdf` template, one extra `Document` wrapper.
2. **Offline write queue** — IndexedDB queue for inspections logged in the field; replay on reconnect. The form already stores enough context to serialize a pending mutation. Workbox + background sync would close the loop.
3. **Report approval workflow** — `ReportApproval` table snapshotting the data at sign-off time; "Approved by X on Y" badge on the Reports page; `Needs re-approval` if the underlying data changes.

### Product

4. **Anchor restore** — soft-deleted anchors can be revived; needs an admin "Recycle bin" view that lists `deletedAt != null` rows with a restore button.
5. **Per-anchor due notifications** — beyond the dashboard banner, actually send the reminders (push / email) at the configured threshold via a scheduled Vercel Cron or external worker.
6. **Inspection templates** — pre-fill common metadata (proof load, drawing ref, building) for repeated inspections on the same anchor.
7. **Client viewer accounts** — invite-only sub-users under a `client` org with even narrower permissions than the current "client admin" role, scoped to specific projects.

### Infrastructure

8. **Activity event table** — promote the derived "Recent events" feed to a real `ActivityEvent` table written from every mutation route. Lets the feed cover anchor edits, drawing pin operations, share-link creation, etc., not just inspections + soft-deletes.
9. **Audit log retention policy** — soft-deleted rows grow unbounded; a nightly job (or Postgres `pg_cron`) that hard-deletes rows older than N days would keep the DB tidy while still giving users a long window to undelete.
10. **Telemetry** — wire a metrics/logging service (e.g. Logtail, Datadog) so production errors and slow queries are visible. Today the only signal is a toast.

### UX polish

11. **Bulk anchor import** — CSV importer that creates anchors in bulk from a spreadsheet. Especially useful for the initial rollout on a building.
12. **Search across projects** — global search shortcut (`Cmd+K`) that hits anchors / inspections / drawings across all accessible projects.
13. **Localization** — strings are English-only. The schema and components don't make this hard to retrofit if you need French / Spanish / etc.

---

## Scripts

```
npm run dev          # Turbopack dev server, http://localhost:3000
npm run build        # prisma generate && next build
npm start            # Run the production build
npm run lint         # ESLint with Next.js config
npm run db:migrate   # Apply Prisma schema changes to the database
npm run db:seed      # Re-seed users, clients, projects, anchors, etc.
npm run db:studio    # Open Prisma Studio against the connected database
```

Tested against Node 20+.
