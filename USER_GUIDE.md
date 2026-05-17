# Anchor Tag Pro: User Guide

A step-by-step walkthrough for using the app, written for first-time users. Follow the sections in order, or jump to whichever feature you need.

> **Tip:** the app works on phones, tablets, and laptops. NFC tag *writing* and the in-app NFC scanner only work on Android (Chrome). On iPhone, hold the phone near an NFC tag and iOS will open the link automatically in Safari, no app needed. Camera-based QR scanning works on any device.

---

## 1. Signing up and logging in

### Creating an account

1. Go to <http://localhost:3000> (or the deployed app URL).
2. Click **Create an account** on the login page.
3. Choose your role:
   * **Inspector**: someone in the field doing the actual inspections.
   * **Company admin**: the business owner or manager who oversees clients, projects, and reports.
4. Enter your name, email, and a password (8+ characters).
5. Click **Sign up**. You'll be signed in automatically and dropped on the Dashboard.

### Logging in (returning users)

1. Open the app. The login page appears.
2. Enter your email and password.
3. Click **Sign in**.

### Demo logins (for first-time exploration)

After the database is seeded, three demo accounts exist (password for all three: `AnchorTag!2026`):

| Role      | Email                              |
| --------- | ---------------------------------- |
| Inspector | `kamata@kamloopsropeaccess.com`    |
| Admin     | `admin@kamloopsropeaccess.com`     |
| Client    | `client@anchorclient.com`          |

Or click **Try demo bypass** on the login screen to jump straight in as the role you select, no password required. Useful for demos.

### Logging out

Click your avatar in the top-right corner, then **Sign out**. A confirm dialog appears in case you tapped it by accident.

---

## 2. Getting your bearings: the Dashboard

After signing in, you land on the Dashboard. Here's what you see:

* **Top bar**: your avatar, the project switcher (if you have access to more than one), and shortcuts to the Scanner and Settings.
* **Side / bottom nav**: links to Dashboard, Anchors, Inspections, Scan, Drawings, Reports, Settings.
* **Hero card**: a welcome with your name and role.
* **Reminder banner** (if any anchors are overdue or due soon).
* **Stat counters**: number of buildings, inspectors, overdue anchors, and reports ready.
* **Due soon**: a queue of anchors that need re-inspection in the next 60 days.
* **Recent events**: the latest inspections and any deletions, with clickable links to the anchor.

### Switching projects

If your account has access to multiple projects (e.g. you're a company admin for several clients):

1. Click the project name next to your avatar in the top bar.
2. Pick a project from the dropdown.
3. The whole app refreshes to show that project's data.

---

## 3. Using the Scanner

The Scanner is the fastest way to pull up an anchor in the field. Tap **Scan** in the nav.

### Option A: Scan an NFC tag (Android only, in-app)

1. Make sure your phone supports NFC and has it turned on (Settings → Connections → NFC).
2. On the Scan page, choose the **NFC** tab.
3. Tap **Start scanning**. Your browser will ask for NFC permission, tap **Allow**.
4. Hold the back of your phone near the tag (within a few centimetres).
5. The app reads the tag's URL and opens the matching anchor's detail page automatically.

### Option B: Scan an NFC tag on iPhone

iPhone browsers can't access NFC directly, but **iOS itself reads NFC tags** in the background since iPhone XS.

1. Make sure the phone is unlocked and the screen is on.
2. Hold the top of the iPhone near the NFC tag.
3. A notification slides down from the top of the screen offering to open the link.
4. Tap the notification. The anchor page opens in your default browser (Safari, Chrome, or whichever browser you've set as default). No app install needed.

### Option C: Scan a QR code with your camera (any phone, including iPhone)

1. On the Scan page, choose the **QR** tab.
2. Tap **Start camera**. Allow camera access.
3. Point the camera at the QR code on the anchor plate.
4. The app reads the code and opens the matching anchor.

You can also use your phone's **native Camera app** to scan a QR plate. The QR code contains a URL, so the Camera app shows a "tap to open" banner that lands you on the same page.

### Option D: Upload a QR image

1. On the Scan page, choose **QR**.
2. Tap **Upload image** and pick a photo of the QR code from your phone.
3. The app decodes it and opens the anchor.

### Option E: Manual entry

If the tag is damaged, you're wearing thick gloves, or there's bad glare:

1. On the Scan page, choose **Manual**.
2. Type the anchor ID (e.g. `RA-03`).
3. Tap **Look up**.

---

## 4. Working with Anchors

### Viewing the list

1. Tap **Anchors** in the nav.
2. You'll see a searchable list with filters:
   * **Search box**: find anchors by ID, label, or location.
   * **Status filter**: All / Ready / Needs review / Awaiting.
   * **Building filter**: narrow to a specific building.
   * **Sort**: most-recent / due-soonest / by ID.

### Viewing anchor details

Tap any anchor in the list to open its detail page. You'll see:

* The anchor ID, label, status, and metadata (location, building, drawing reference, installation date, last test date, next due date, NFC chip serial).
* An **Edit** button (admin, client, and inspector roles).
* **Open drawing**: jumps to where this anchor is pinned on its roof plan, or to the Drawings library if it isn't pinned yet.
* **Log inspection**: starts a new inspection for this anchor.
* **NFC writer card**: lets you write the anchor's URL to a blank NFC tag (Android only).
* **QR plate card**: shows the QR code with options to download as PNG, SVG, quick-print template, or engraving-ready 75×50 mm plate PDF.
* **Visual record**: a collapsible photo gallery grouped by inspection, newest first.
* **Inspection history**: timeline of every inspection ever done on this anchor.

### Creating a new anchor

1. On the Anchors list, tap **+ New anchor**.
2. Fill in:
   * Anchor ID (must be unique within the project).
   * Label (a human-friendly name).
   * Building.
   * Location notes.
3. Tap **Create**. You'll land on the new anchor's detail page.

### Editing an anchor

1. On the anchor detail page, tap **Edit**.
2. Update any field (label, building, location, drawing, NFC chip serial).
3. Tap **Save**.

### Deleting an anchor

1. On the anchor detail page, tap **Delete**.
2. A confirm dialog appears asking you to **type the anchor ID** exactly to confirm. This prevents accidental deletes.
3. Type the ID and tap **Delete anchor**.

Deletes are **soft**: the anchor disappears from the list but the audit trail is preserved (who deleted it, when). An admin can restore it later via the recycle bin (planned).

### Writing an NFC tag (Android only)

You'll do this once per physical anchor: take a blank NFC sticker (NTAG213 or similar), program it with the anchor's URL, then stick it on the anchor plate. After that, any phone (iPhone or Android) can tap the tag to open the anchor's page.

**What you need:**

* An **Android phone** with NFC enabled (Settings → Connections → NFC).
* The app open in **Chrome** over **HTTPS** (Web NFC won't work over plain `http://` except on `localhost`).
* A **blank NFC tag** (NTAG213 stickers from any electronics supplier are perfect — they have ~137 bytes of usable space, plenty for a URL).

**Steps:**

1. Open the anchor's detail page in Chrome on your Android phone.
2. Scroll to the **NFC writer** card.
3. Choose the **payload type**:
   * **URL only** (default, recommended): writes just the anchor's URL. Smallest payload, fits any NFC tag, and is what iPhone native NFC reads.
   * **URL + metadata**: also writes a JSON snapshot of the anchor data as a MIME record. Only fits on tags with more memory (NTAG215 / NTAG216). Useful if you want offline-readable metadata, but not required.
4. Tap **Write tag**. Your browser will ask for NFC permission, tap **Allow**.
5. Hold the back of your Android phone against the blank NFC tag (within a few centimetres).
6. Wait for the success toast. The tag now contains the URL.
7. A prompt appears asking for the **NFC chip serial number**. Each NFC chip has a unique factory-burned ID (printed on the back of most sticker rolls, or visible during the write). Enter it and tap **Save** so the app can prove this specific chip is the official tag for this anchor. You can also skip this and add it later via **Edit anchor**.

**Tip:** Test the tag right after writing. Open a fresh tab, hold the phone near the tag, and check that it opens the right anchor page. If it doesn't, re-write it — sometimes the tag wasn't close enough during the write.

**Stick it on the anchor:**

* Peel the backing off the NFC sticker.
* Stick it to a flat, non-metal surface on or near the anchor (metal interferes with NFC signal — use an "on-metal" tag if you must place it directly on a steel plate).
* For permanent installations, an engraved anodized aluminum **plate** with both the QR code and the NFC tag embedded is the recommended option. See the next section for plate generation.

### Generating QR codes and engraving plates

Every anchor automatically gets a QR code. You can download it in several formats depending on what you need.

1. Open the anchor's detail page.
2. Scroll to the **QR plate** card. The QR code is shown alongside download buttons.

**Format options:**

* **PNG** — a high-resolution image file. Good for embedding in emails, documents, or printing labels with a regular office printer. Uses H-level error correction (30%), so the code still scans even if part of it is scratched or dirty.
* **SVG** — a scalable vector format. Use this if a sign-maker or print shop is going to enlarge the QR code without losing quality (e.g. for big rooftop signage).
* **Quick print** — opens a print-ready page with the QR code and the anchor ID, formatted for a standard letter / A4 sheet. Hit **Print** in your browser to make a paper backup.
* **Plate PDF (75 × 50 mm)** — this is the headline option. Generates an **engraving-ready PDF** at the exact dimensions of the standard anchor tag (75mm wide × 50mm tall). Send this file straight to an engraver and they can cut an anodized aluminum plate with:
  * The anchor ID printed large at the top
  * The location text underneath
  * The QR code (scannable by any phone)
  * The NFC N-mark symbol (so people know it's tap-enabled)
  * A "Do not paint" warning
* This is what you'd attach to the actual anchor on the roof — durable, weather-resistant, and machine-readable.

**Workflow for a brand-new anchor:**

1. Create the anchor in the app (section 4).
2. Open its detail page and tap **Download plate PDF**.
3. Send the PDF to your engraver. They'll produce the physical aluminum plate.
4. When the plate arrives, also write a blank NFC sticker (steps above) and stick it to the back of the plate, or order tags with embedded NFC chips so it's all-in-one.
5. Install the plate on the roof next to the anchor.
6. Tap the plate with your phone to verify both the QR and NFC work.

> **Why two scan methods on one plate?** Because not every phone or hand is the same. Gloves and rain make camera scanning hard; corroded plates can make the QR unreadable; an iPhone in a thick case may struggle with NFC. Having both gives inspectors a reliable backup in any condition.

---

## 5. Logging Inspections

### Starting a new inspection

You can start an inspection from two places:

* On an anchor's detail page, tap **Log inspection**.
* On the Inspections list page, tap **+ New inspection** and pick the anchor from the dropdown.

### Filling out the form

1. **Anchor**: pre-filled if you started from a detail page.
2. **Inspector**: defaults to your name if you're logged in as an inspector. Admins/clients pick from the roster.
3. **Test date**: when the inspection was performed.
4. **Next due date**: when the next inspection is required.
5. **Proof load** (kN), if applicable.
6. **Result**: Pass / Fail / Conditional.
7. **Notes**: any observations.
8. **Photos**: tap **Add photo** to upload images from your camera roll or take a fresh photo. Each photo is stored securely in cloud storage.
9. **Signature**: sign in the box using your finger or a stylus. You can clear and re-sign if needed.

### Saving

1. Tap **Save inspection**.
2. The app validates the form and uploads any new photos.
3. You're redirected back to the anchor's detail page, where the new inspection appears at the top of the timeline and its photos appear in the visual record gallery.

### Editing an inspection

1. On an anchor detail page or the Inspections list, tap the inspection you want to edit.
2. Tap **Edit**.
3. Update fields, add or remove photos, re-sign if needed.
4. Tap **Save**. You're redirected back to the anchor page.

### Deleting an inspection

1. Open the inspection.
2. Tap **Delete**. Confirm.
3. The inspection is soft-deleted (audit trail preserved).

### Browsing photos across inspections

1. Open an anchor's detail page.
2. Scroll to the **Visual record** card.
3. Tap any thumbnail. A full-screen viewer opens.
4. Use the arrow keys, swipe, or the on-screen arrows to move through every photo on this anchor, across all inspections. Useful for comparing condition year-over-year.
5. Tap the **open in new tab** icon to view the original file.
6. Press **Esc** or tap **×** to close.

---

## 6. Working with Drawings

### Viewing drawings

1. Tap **Drawings** in the nav.
2. You'll see cards for every roof plan uploaded to the current project.
3. The header tells you which building and which project you're viewing.

### Uploading a new drawing (admin and client only)

1. Tap **+ Upload drawing**.
2. Choose a PNG, JPG (up to 16 MB) or PDF (up to 32 MB) file from your computer.
3. Add a name and select which building it belongs to.
4. Tap **Upload**. The drawing appears as a new card.

### Pinning anchors on a drawing (admin and inspector)

1. On a drawing card, tap **Pin anchor**.
2. The drawing opens full-size.
3. Tap the spot on the plan where the anchor is located.
4. Pick the anchor from the list.
5. The pin appears as a coloured circle with the anchor's ID. Status colour matches the anchor's state (green = ready, amber = needs review, red = overdue).

### Removing a pin

1. On the drawing card, tap the pin.
2. Tap **Remove pin** in the popup.

### Downloading a drawing

1. On a drawing card, tap the **Download** button (split with a chevron).
2. Choose one of two options:
   * **With pins** (default): downloads the plan with pin markers and anchor IDs burned in.
   * **Original**: downloads the file you originally uploaded, no markers.

### Attaching extra files

A drawing card can also have a PDF attachment (e.g. an architect's detail sheet) for reference. Use **Attach file** to add one.

---

## 7. Inspections list (full history)

Tap **Inspections** in the nav for a project-wide log of every inspection:

* Filter by anchor, inspector, result, date range.
* Tap any row to open the inspection.
* Tap the anchor link in the row to jump to that anchor.

---

## 8. Reports

### Viewing reports

1. Tap **Reports** in the nav.
2. You'll see one report per building, plus a **Full inspection log** for the whole project.
3. Each report shows status pills derived from the live data:
   * **Awaiting inspections**: no inspections logged yet.
   * **Needs review**: at least one anchor has Failed or Conditional.
   * **Ready**: every anchor in scope has passed and is in date.

### Previewing a report

Tap a report card. A preview shows the same data that will be in the PDF.

### Exporting a PDF

1. On a report preview, tap **Download PDF**.
2. The app generates a polished multi-page PDF with the company branding, anchor registry table, recent inspections, and a footer with page numbers.
3. The file downloads to your device.

### Exporting a CSV

1. On a report preview, tap **Download CSV**.
2. A spreadsheet-friendly CSV downloads. Open it in Excel, Numbers, or Google Sheets.

### Emailing a report to a client

1. On a report preview, tap **Email client**.
2. The app generates the PDF and downloads it to your computer.
3. Your default mail client opens with a pre-filled subject and body. The message instructs you to attach the just-downloaded PDF.
4. Drag the downloaded PDF into the email, fill in the recipient, and send.

> Why the manual attach step? The app intentionally uses your own mail account (via `mailto:`) rather than a paid email service. Keeps the demo self-contained.

---

## 9. Sharing a project with a client (without giving them a login)

Admins and clients can generate a public read-only link:

1. Go to **Settings**.
2. Find the **Share report links** section.
3. Tap **+ Create share link**.
4. Pick which project the link should expose.
5. Copy the generated URL (something like `/share/<random-id>`).
6. Send it to the client. They can open it in any browser without logging in. The page is read-only and not indexed by search engines.

To revoke a link, tap the trash icon next to it in Settings.

---

## 10. Settings

Tap **Settings** in the nav. Available sections (some depend on role):

### Profile

* Edit your display name, email, and password.
* Upload a profile photo. The photo appears in the top bar, on every inspection you log, and in the inspector picker.

### Appearance

* **Theme**: Light / Dark / System.
* **Brand palette**: switch between the modern Anchor (steel-teal) palette and the classic KRA (warm orange and cream) palette.
* **Language**: English / Canadian French.

### Reminders

Toggle the 60-day, 30-day, and 7-day reminder windows. The Dashboard banner uses these to surface upcoming and overdue anchors.

### Roster (admin and client)

Add, edit, or remove inspectors who can be assigned to inspections.

### Buildings (admin and client)

Add buildings, rename them, or delete them. Renaming cascades to every anchor and drawing pointing at that building.

### Share report links

Create and revoke public read-only links (see section 9 above).

---

## 11. Tenancy (admin only)

The **Tenancy** page is a separate item in the nav for admin users. It manages the structural data behind the app:

* **Clients**: companies whose anchors you inspect.
* **Projects**: usually one per site, belonging to a client.
* **Memberships**: which users have access to which client, with optional admin rights within that client.

### Adding a client

1. Tap **+ New client**.
2. Enter the client's name and any contact info.
3. Save.

### Adding a project under a client

1. Open the client.
2. Tap **+ New project**.
3. Enter a project name (usually the site address).
4. Save.

### Granting a user access to a client

1. Open the client.
2. Tap **+ Add member**.
3. Pick the user and choose their role within this client (admin or member).
4. Save.

---

## 12. Quick troubleshooting

* **"NFC scan not available"** on iPhone: this is expected. iPhone browsers can't access NFC. Use the Camera app instead, or have iOS auto-open the tag URL by holding the iPhone near the tag while unlocked.
* **Camera doesn't open on the Scan page**: make sure you tapped **Allow** when the browser asked for camera permission. On iPhone you may need to enable the camera for Safari in Settings → Safari → Camera.
* **PDF download doesn't appear**: check your browser's download folder. Some browsers (especially on iOS) save to Files → Downloads instead of opening directly.
* **"You don't have permission"** errors: each role has different rights. See the role table in `README.md` for who can do what.
* **Forgot password**: there's no self-serve reset in the demo. An admin can re-create the account, or use the demo bypass.

---

## 13. Where to learn more

* **`README.md`** in the repository has the full technical breakdown: architecture, security model, role permissions matrix, tech stack, and project structure.

Happy inspecting.
