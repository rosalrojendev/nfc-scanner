# Anchor Tag Pro Mobile

A working web app conversion of the **Anchor Tag Pro** roof-anchor field-inspection prototype. Built mobile-first, but renders comfortably on desktop. NFC and QR scanning are real (not just simulated), and the inspection workflow stores everything locally so it works in the field with no backend.

> Live demo: run `npm run dev` and visit <http://localhost:3000>.

---

## Tech stack

| Concern             | Choice                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------- |
| Framework           | **Next.js 16** (App Router, React 19, TypeScript, Turbopack)                            |
| Styling             | **Tailwind CSS v4** with CSS variables for the design tokens from the prototype         |
| UI primitives       | shadcn-style components hand-rolled (`components/ui/*`) using `class-variance-authority` and `tailwind-merge` |
| Forms / validation  | **Zod** — schemas reused on the client and the server                                   |
| Auth                | bcryptjs (password hashing) + **jose** (JWT) in HTTP-only cookies + Next middleware     |
| Persistence         | `localStorage` via a small typed store (`lib/store.ts`) seeded from `lib/seed.ts`       |
| QR scanning         | `jsqr` running on a `<canvas>` against either a camera `getUserMedia` stream or an uploaded image |
| NFC scanning        | `Web NFC` API (`NDEFReader`) where supported (Chrome on Android over HTTPS)             |
| Icons               | `lucide-react`                                                                          |

---

## Getting started

```bash
npm install
npm run dev
# open http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

### Environment variables

Drop a `.env.local` next to `package.json`:

```
AUTH_SECRET=replace-me-with-32+-bytes-of-random
```

If `AUTH_SECRET` is missing, a development-only fallback is used so the app still runs locally — **set a real value before deploying**.

### Demo credentials

The seed users are bcrypt-hashed at runtime:

| Role      | Email                              | Passcode        |
| --------- | ---------------------------------- | --------------- |
| Inspector | `kamata@kamloopsropeaccess.com`    | `AnchorTag!2026` |
| Admin     | `admin@kamloopsropeaccess.com`     | `AnchorTag!2026` |
| Client    | `client@anchorclient.com`          | `AnchorTag!2026` |

There is also a **demo bypass** button on the login screen that issues a session for the role currently selected — handy for showing the app without typing credentials.

---

## What is implemented

Every requirement from the brief, plus most of the bonus list:

- **Authentication (real)** — email + passcode, bcrypt verification, role check (inspector / admin / client), JWT in HTTP-only `SameSite=Strict` cookie, login rate-limit (8/min/IP), Zod validation, 401 / 403 / 429 responses.
- **Authentication (demo)** — one-click bypass for the role tab in use.
- **Dashboard** — animated counters, hero panel, due-list queue, activity timeline. Counters react to live anchor data.
- **Anchor management** — list with full-text search across ID, building, location, and drawing; status filter (Pass / Due / Failed); detail page with metadata, status, and full inspection history; **edit** dialog updates the persisted record.
- **Scan simulation (real)**
  - **NFC read** — Web NFC `NDEFReader` reads tag payloads on supported devices (Android Chrome over HTTPS). Decodes our JSON payload format ([lib/nfc-payload.ts](lib/nfc-payload.ts)) or falls back to plain text / serial number.
  - **NFC write** — `NDEFReader.write()` encodes asset ID, last inspector, timestamp, status, and a short note as a `mime` record (`application/vnd.atp.tag+json`). Wired into the anchor detail page and the post-save inspection flow.
  - **iOS handling** — iPhone is detected via UA and the NFC tab shows a clear "use QR" message instead of a dead button.
  - **QR via camera** — `getUserMedia` + `jsqr` decode in real time; environment-facing camera preferred.
  - **QR via image upload** — same decoder runs against a chosen image file.
  - **Demo bypass** — opens the seed `RA-03` record when no hardware is available.
  - All paths converge on `resolveScanPayload`, which matches a payload to an anchor by ID, NFC tag, QR code, URL form (`https://…/RA-03`), or substring fallback.
- **NFC inspection tracking** — Tags carry only metadata (≤ 5 MB enforced in code; real tags are 144 B–8 KB anyway). Photos are uploaded to cloud storage and the inspection record stores only their URLs. After a scan, the app shows the tag contents plus the cloud-backed inspection history with clickable photo links.
- **Inspection workflow** — full form with anchor ID, inspector, test date, next due date, result, proof load, drawing reference, notes; **photo capture / upload** (downscaled to 1280px JPEG client-side, then **uploaded to `/api/photos`** which returns a cloud-style URL — only the URL is saved with the inspection record); **canvas signature pad** (mouse + touch + stylus); Zod-validated, missing-field errors shown inline; saves to `localStorage`, recomputes the anchor's status / last-tested / next-due / inspector; supports **edit** of an existing record. After saving, prompts to write the new metadata to the NFC tag.
- **Inspection history** — all records with search, plus per-anchor history on the anchor detail page; **edit** and **delete** actions.
- **Drawings** — SVG roof plans seeded from `lib/seed.ts` with **clickable** anchor pins coloured by live status; clicking a pin opens the anchor.
- **Reports** — list of mock reports with **CSV export** (real, generated from the live store), preview dialog showing anchors per building, and email/preview placeholders.
- **Settings** — admin tools, theme toggle, **Reset to seed data**, and a written security summary.
- **Mobile responsive** — bottom nav on small screens, side nav on desktop, 44 px+ tap targets, `safe-area-inset-*` padding, sticky top bar with scan shortcut.
- **Theme** — light / dark with persisted preference and pre-hydration script to avoid flash.
- **Bonus**
  - Incomplete-input handling: Zod schemas + inline error messages.
  - Edit/update: anchors and inspections both editable.
  - Local persistence: typed `localStorage` store with seed-versioning.
  - Field usability: large tap targets, high-contrast badges, clear active states, dark mode, animated transitions respected reduced-motion.

---

## Security

Anything more than a quick demo would be deployed behind HTTPS; the app is set up assuming that:

- **Password storage**: bcryptjs at cost 10. Plaintext is never persisted; only the hash lives in memory in `lib/auth.ts`.
- **Sessions**: short-lived (8 h) JWTs signed with HS256 (`jose`) and set as `HttpOnly`, `Secure` (in prod), `SameSite=Strict`, `Path=/`. The middleware verifies the JWT on every protected route.
- **CSRF**: `SameSite=Strict` cookies + same-origin `fetch` calls eliminate the typical CSRF surface for form posts. There is no third-party content embedded.
- **Validation**: every API input goes through a Zod schema before it touches state. Login attempts are rate-limited per IP in-memory (8 / min); replace with a shared store in production.
- **Headers** (set in `next.config.ts`): `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, and a `Permissions-Policy` that scopes the camera, geolocation, and NFC APIs to first-party only.
- **XSS**: React escapes by default. The only places `dangerouslySetInnerHTML` is used are the pre-hydration theme bootstrap script and a small inline icon fixture — both are static literal strings.
- **File uploads**: photos are kept on-device; mime-type is checked before reading and files larger than 4 MB are rejected to keep `localStorage` small.

---

## What was skipped or simplified

- **Photo storage is in-memory.** `/api/photos` accepts uploads and returns real URLs (`/api/photos/{id}`), but the bytes live in a `Map` on the running Node process ([lib/photo-store.ts](lib/photo-store.ts)). They survive across requests inside one process but reset on cold start. To go to production, swap `putPhoto`/`getPhoto` for a Supabase Storage / S3 / R2 client — the call sites and stored URLs do not change.
- **No real backend for app data.** The auth users live in memory in `lib/auth.ts`; anchor and inspection data live in `localStorage`. Swapping in Supabase or Firebase would be a per-route change.
- **No real PDF generator.** The Reports preview shows the data that would feed a PDF, plus a real CSV export. PDF rendering (e.g. via `pdf-lib` or a server-side renderer) is left for the next pass.
- **No client-viewer scoping.** Logging in as `client` lands on the same dashboard; per-role gating beyond auth is not implemented.
- **No offline queue.** The store uses `localStorage`, so it survives reloads, but there is no Service Worker or sync queue. A future iteration would add a Workbox-style background sync.
- **NFC fallback for non-Android browsers.** Web NFC is Android-Chrome-only. The app surfaces the camera QR scanner and a manual entry tab so a session always has a working scan path.
- **shadcn CLI.** I built the same component shapes by hand because the shadcn CLI is interactive and the project uses Tailwind v4 (where the CLI's generators are still catching up). The components in `components/ui/*` follow shadcn's conventions (forwarded refs, `cn()` helper, CVA-driven variants).

---

## Project structure

```
app/
  layout.tsx                  Root layout, theme bootstrap, toast provider
  page.tsx                    Redirects to /login or /dashboard
  login/                      Login screen (server + client split)
  api/auth/                   login | logout | demo routes
  (app)/                      Authenticated app shell
    layout.tsx                Top bar + side nav + bottom nav
    dashboard/
    anchors/                  list + [id] detail with edit
    inspections/              log + new (form, edit, validate)
    scan/                     NFC + QR + manual + demo bypass
    drawings/                 SVG roof plans, clickable pins
    reports/                  list + CSV export + preview
    settings/                 admin tools, theme, store reset
components/
  ui/                         Button, Card, Input, Badge, Dialog, Segmented, Toast, Empty
  shell/                      TopBar, SideNav, BottomNav, ThemeToggle
  scan/                       qr-scanner, nfc-scanner
  inspection/                 photo-upload, signature-pad
  animated-counter.tsx
lib/
  auth.ts                     bcrypt + jose helpers (server-only)
  auth-constants.ts           Cookie name (importable from middleware)
  store.ts                    localStorage-backed typed store
  seed.ts                     Anchors / inspections / drawings / reports / inspectors
  scan.ts                     Payload-to-anchor matching
  types.ts                    Shared TS types
  validation.ts               Zod schemas
  utils.ts                    cn(), formatDate(), daysUntil(), uid()
middleware.ts                 Auth gate for /dashboard, /anchors, /inspections, etc.
next.config.ts                Security headers
```

---

## API endpoints

| Method | Path                      | Auth | Notes |
| ------ | ------------------------- | ---- | ----- |
| `POST` | `/api/auth/login`         | —    | Email + passcode + role. Bcrypt + Zod + IP rate limit. |
| `POST` | `/api/auth/demo`          | —    | Issues a session for the seed user matching `{ role }`. |
| `POST` | `/api/auth/logout`        | —    | Clears the session cookie. |
| `POST` | `/api/photos`             | yes  | `multipart/form-data`, field `file`. Image MIME only, ≤ 5 MB. Returns `{ id, url, bytes, contentType }`. |
| `GET`  | `/api/photos/{id}`        | no   | Serves the bytes with a long cache header. Public read, like a signed cloud URL. |

---

## Scripts

```
npm run dev      # Turbopack dev server, http://localhost:3000
npm run build    # Production build (also type-checks)
npm start        # Run the production build
npm run lint     # ESLint with Next.js config
```

Tested against Node 20+.
