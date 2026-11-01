# Contributing and testing

Use a separate synthetic wardrobe for development and testing. Preserve personal wardrobe data and unrelated work. Keep user guides concise; record dated experiments and verification evidence in the [development archive](docs/archive/DEVELOPMENT-RECORDS.md).

## Source structure

- `app/closet-lint.html` is the portable frontend, with maintained scripts and styles embedded from `app/scripts` and `app/styles`.
- `runtime` owns the Python service, SQLite storage, browser adapter, imports, photos, and backups.
- Board modules separate session/draft transitions, editor gestures, collage layout, and design/export. Saved outfits, recovered boards, and the active editor must not share mutable documents.
- `tests` contains focused JavaScript, Python, and browser checks. `tools/build_release.py` packages explicitly allowed source and documentation; changes must not add private data.

For detailed editor, performance, and algorithm history, see the [development records](docs/archive/DEVELOPMENT-RECORDS.md).

## Runtime and storage

Closet Lint uses a Python HTTP service with SQLite storage and a plain HTML, CSS, and JavaScript frontend. Python 3.10 or newer is required. Running the app needs no frontend build or additional Python packages; optional photo tools have separate dependencies.

For local startup commands, the sample collection, and phone access on a trusted home network, see [Getting started](docs/GETTING-STARTED.md#start-the-app). For experimental protected hosting, see [web hosting](docs/WEB-HOSTING.md). Hosting adds deployment and access control requirements; the local server alone is not a public hosting setup.

### Data folder

Pass a writable folder outside the source tree with `--data`. It holds `wardrobe.sqlite3`, photo data, recovery snapshots, and temporary restore uploads. Keep it private and backed up. Source updates must not replace it.

The database stores document collections, image blobs, the base catalog, and the working board. A new empty wardrobe opens the setup wizard. Browser display preferences remain separate.

### Service boundary

The service binds to loopback by default. `--lan-ip` enables an explicitly selected address on a trusted network. There are no accounts: anyone who can reach the page can view and edit that wardrobe. Whole record writes do not merge concurrent edits. Released versions without stale save protection should be edited from one device at a time. This source version rejects stale record and board writes while retaining unfinished browser edits; see [stale save checks](docs/archive/DEVELOPMENT-RECORDS.md#testing-records).

`runtime/server.py` serves the app, adapter, API routes, and ID-addressed photos. It does not serve arbitrary files or directory listings. Host and origin checks reject unexpected browser requests, and API calls require the token delivered with the app page. That token protects against cross-site requests; it is not user authentication. See [SECURITY.md](SECURITY.md).

`runtime/browser.js` supplies collection listeners, serialized writes, uploads, and downloads. Failed writes remain visible as failures. Preserve unsaved work before refreshing after a storage error.

### Backup and restore

A full backup ZIP includes all document collections, the base catalog and tags, stored photos, and the working board. It excludes browser display preferences, disposable photo caches, and the optional photo processing environment.

Restore previews do not change the wardrobe. Applying a full restore validates references, file types, and archive integrity, then replaces the destination inside one database transaction. An existing wardrobe gets a recovery snapshot under `DATA/recovery/` before replacement. These SQLite snapshots are private recovery files, not ZIPs for the restore dialog.

Board autosaves pause during restoration. Pending writes must finish successfully before a backup can complete. Backups use a consistent read transaction. Keep a separate backup even when recovery snapshots exist. Backup format changes and rollback requirements are listed in [updating and moving](docs/GETTING-STARTED.md#updating-and-moving).

An offline export is available with the server stopped:

```bash
python3 runtime/server.py --data /path/to/wardrobe \
  --export-backup /path/to/new-backup.zip --prepare-only
```

The destination filename must be new. See [updating and moving](docs/GETTING-STARTED.md#updating-and-moving) for moving computers and rollback limits.

### Optional photo tools and imports

The supported [AI assistant importer](docs/AI-ASSISTANT.md#ai-assistant-imports) adds validated pieces and local photos without replacing the wardrobe. The app itself does not read email or scrape retailers.

Assistant photo imports and [local background removal](docs/USING-CLOSET-LINT.md#photos) share an optional environment on the server computer, configured by `tools/setup_photos.py`. The import CLI automatically delegates to that environment. `tools/check_setup.py` probes the configured interpreter and packages without installing software or changing wardrobe records. Existing `background-removal.json` configurations remain supported; shared setup uses `photo-tools.json` and reuses a compatible existing environment. A phone uses the same server tool. Models and dependencies are installed separately; originals and accepted results remain in the wardrobe backup. Environment configuration and installed packages are machine-specific and are recreated after moving computers.

### Operational limits

- This server does not provide TLS, accounts, public sharing, or multi-user isolation. Do not expose it directly to the internet.
- Allow free disk space for the active database, a restore upload, and a recovery copy.
- With the service stopped, abandoned ZIP files under `DATA/staging/` can be removed. Keep recovery snapshots until you are sure they are no longer needed.
- Databases and backups rely on operating system permissions and device security; the app does not encrypt them.
- A raw HTML file has no writable local runtime. Use the server’s address.

Developer checks and remaining verification are documented in [contributor checks](CONTRIBUTING.md#testing).

## Testing

With Node/npm and Python available:

```bash
npm test
```

This runs JavaScript checks plus Python storage, import, sample, and HTTP handler tests. The default app needs no npm installation. Photo import tests require Pillow; install `runtime/requirements-import.txt` into your chosen Python environment and run the tests with that environment active. Some optional photo checks skip when dependencies are unavailable; inspect the test output.

For focused changes, run the relevant existing test rather than repeating every suite. Use the full suite for storage, import/export, cross-cutting behavior, or release checkpoints.

Coverage includes:

- Navigation, preference persistence, filters, collections, board/outfit isolation, layering, and packing behavior.
- Bookmarks, Back/Forward, and guards for unsaved piece, collection, outfit, and trip edits.
- Import validation, duplicate handling, image metadata, retry/idempotency, and transactional failure behavior.
- Existing piece photo preparation: local and returned ZIP results, exact IDs, preserved originals/tags/history, stale photo rejection, atomic saves, retry receipts, and the split handoff.
- Storage persistence, full backup/restore, missing photo rejection, recovery snapshots, and rollback.
- Unsafe text/URLs, poisoned JSON keys, malformed archives and image headers, request tokens, origin/Host checks, and CSP generation.
- The 12-piece sample’s taxonomy, photos, export/restore, and refusal to replace a nonempty wardrobe.

Run `npm run test:print` with Playwright and Chromium for packing PDF pagination, including photos, outfit appendices, paper sizes, print scaling, and stray invisible text. CI runs this check.

HTTP handler tests use in-memory connections. They do not replace a listening server test. JavaScript VM tests do not verify native dialogs, focus behavior, rendering, or mobile keyboards.

## Browser and device checks

The optional smoke suite needs Playwright and a browser installation:

```bash
npm ci --ignore-scripts
npx playwright install chromium
npm run test:browser
```

`tests/smoke.js` checks the code-only app at desktop and phone widths. It is a smoke check, not complete coverage of writable storage or the user journey. Use a separate synthetic sample for manual checks with the live server.

Before release, verify:

- All three themes at desktop and narrow phone widths, including text-only labels, large text, focus visibility, modal scrolling, and keyboard clearance.
- Creating and editing pieces, galleries, swatches, optional cutouts, and bulk photo review.
- The working board versus saved outfits, including drag/resize controls and reachable handles for tall pieces.
- Collections, long lists, filters, and returning from a piece with scroll position restored.
- Trip creation, packing generation, unavailable pieces, pinned outfits, rebuilding, saving, and reopening.
- Calendar month links, bookmarked pieces/outfits/collections/trips, and Back/Forward with unsaved edits. Cancelling a discard must preserve the view, address, and edits.
- Full backup and restore with photos, plus recovery from a failed save.
- Real Android/iOS keyboards, assistive technology, and the supported installation platforms.

Keep browser reviews bounded and use a separate test wardrobe. Use only accounts, sites, and data you have permission to access. Project-specific automation instructions belong in the development workflow, rather than the app’s installation requirements.

## Recurring UI layout review

For each UI change, inspect the whole affected section, including what comes immediately before and after it. An isolated control screenshot is not enough. For layout and control changes, visually check the affected states at 390px, 768px, and a laptop width. Shared style changes need all three themes in light and dark appearances.

Use this same checklist each time:

- Give headings, helper text, fields, action rows, and images distinct space. Use a container gap for a sequence of related blocks; do not depend on default paragraph margins. Aim for 12px between helper text and actions, and 16–24px between sections unless an established component specifies otherwise.
- Give icons and labels an explicit gap, usually 8px. Leading spaces in text do not create reliable spacing in flex layouts. Center the icon and label vertically, and retain the control's intended horizontal alignment.
- Check short and wrapped helper text, long names, wrapping button rows, and both expanded and collapsed sections. Watch for uneven gaps, cramped labels, overflow, and controls pressed against container edges.
- Keep button surfaces distinct from fields and disclosure rows. Check selected, disabled, hover, and keyboard focus states, and ensure swatches, images, and icon shapes do not gain unintended background tiles.
- Keep reading, tab, and action order coherent as controls wrap. Check that all actions remain reachable above mobile navigation and within scrolling dialogs or toolbars.
- Exercise the relevant save, Undo, Cancel, and retry paths when controls are moved or reworked. Use synthetic data, and preserve the working board.

Report which layouts and states were actually reviewed, and any checks that remain unverified. This is a focused review of affected screens, not a requirement to repeat every app flow for a copy change.

## Keeping embedded sources synchronized

The served HTML contains embedded copies of several maintained source files. After editing one, run its sync tool:

- `app/styles/themes.css`: `python3 tools/sync_theme_styles.py`
- `app/scripts/categories.js`: `python3 tools/sync_categories.py`
- `app/scripts/setup.js`: `python3 tools/sync_setup.py`
- Collections and navigation modules: use the corresponding `tools/sync_*.py` helper.
- Import categories and tag vocabulary: `node tools/sync_import_vocab.js`

The existing tests check relevant synchronization and source invariants.

## Accessibility

The bounded 0.4 pass improves keyboard board controls, menu focus return, visible focus, contrast, labels, reduced motion, and system high-contrast support. It does not establish full accessibility conformance. Mobile target dimensions remain unchanged by the owner’s request.

Run `npm run test:a11y` for the browser matrix, keyboard/reflow interactions, and focus/preference checks. The reviewed baseline retains mobile scroll edge findings; new findings, worse measured contrast, scan errors, and failing interactions block the regression check. Do not silently add failures to the baseline. Physical device, screen reader, collage/text, and deeper state acceptance remain follow-ups.

The [accessibility records](docs/archive/DEVELOPMENT-RECORDS.md#accessibility-records) contain the dated findings and deferred review links. Report security concerns through [SECURITY.md](SECURITY.md).

## Documentation

- [Getting started](docs/GETTING-STARTED.md): installation, optional setup, updates, and recovery.
- [Using Closet Lint](docs/USING-CLOSET-LINT.md): pieces, photos, outfits, trips, settings, and Sky/cards.
- [AI assistant imports and Oracle](docs/AI-ASSISTANT.md): import and photo workflows, Oracle conversations, and assistant command reference.
- [Web hosting](docs/WEB-HOSTING.md): experimental protected hosting.
- [Release notes](docs/RELEASE-NOTES.md).
- [Third-party inventory](docs/THIRD-PARTY.md): dependencies, services, and asset terms.

Keep “AI assistant” on first mention in each user-facing document or section. Use “My” for labels naming the user’s things and “you/your” in helper sentences. Keep user upgrade instructions brief. Update all links, generated assistant instructions, and the package allowlist when moving a guide.

## Release preparation

### Current 0.4 scope · 31 October 2026

Feature work is frozen for release preparation. Resolve reported defects, reconcile documentation, and verify the final candidate. Source changes, private installations, and demos do not by themselves establish a published release.

Implemented in the current source:

- **Trips and events:** unfinished trip saving, daily outfit planning and pinned choices, packing quantities, reminders, and print/PDF/Markdown exports with optional photos and outfit combinations.
- **Categories and pieces:** expanded searchable categories and setup choices, populated category visibility, pullover/cardigan/vest types and layering defaults, Eyewear with Glasses/Sunglasses subcategories, optional fabric weight, approximate acquisition dates, and recent wear indicators. The strip shows ten days; heat thresholds are three/eight logged days in thirty days.
- **Metal & finish:** optional grouped material, metal tone, and finish tags for jewelry, watches, and bags. The universal color palette is unchanged.
- **Imports, photos, and Oracle:** batch import and Tidy photos pages with review recovery, photo only preparation for existing pieces, scoped Oracle context/photos, explicit local/SSH/download workflows, and remembered route choices. Direct access still requires a configured, approved connection in the AI assistant session; the app does not establish SSH access.
- **Controls and reliability:** representative calendar thumbnails and clearer day details, card menus, category first browsing, predictable collection clearing, board photo refresh/removal/initial sizing fixes, steadier save feedback, and a maximum of three outfit columns. Stale tab protection and atomic outfit wear logging remain in place.
- **Bounded accessibility improvements:** keyboard controls, focus visibility, contrast, labels, reduced motion, and regression checks. The [accessibility review](CONTRIBUTING.md#accessibility) records the limits; mobile targets remain unchanged by request.

Trello holds working task status. This document records scope and release gates; it is not automatically synchronized with Trello.

### Release verification

Owner review has produced substantial Trips, outfit, board, category, photo, and mobile feedback. The hosted photo only workflow has been exercised, and the category cleanup is complete. Tablet and narrow mobile browser reviews are recorded in [testing](CONTRIBUTING.md#testing). 

Stephanie confirmed her focused browser and phone review complete on 1 November 2026. The remaining reported defect was a blank final packing PDF page. A further print fix suppresses anonymous text outside the sheet; browser regression coverage checks photos, outfit appendices, Letter/A4, and print scaling. The final candidate passed 81 JavaScript checks, 171 supported Python tests, browser pagination, accessibility regression, fresh installation/import, and hosted update/recovery rehearsals. Stephanie approved publication on 1 November 2026. Windows/macOS installation and broader physical device or assistive technology acceptance retain their documented limits.

### Trip defaults retained for 0.4

Automatic underwear, bra, sock, and sleepwear groups use owned catalog presence. Underwear types share one quantity; generic loungewear does not imply sleepwear. Explicit choices remain recoverable, and activity requests can still show reminders for uncataloged swimming/exercise needs. Stored and filtered pieces use catalog scoped reminders. Suggestions are starting points, not evidence of everything a person owns or guarantees of comfort, dress code, weather protection, or laundry timing. See [Trips](docs/USING-CLOSET-LINT.md#trips-and-packing) for user guidance.

### Deferred work

- Unified chronological board Undo, alternate piece photos per board, board edge movement and toolbar investigations, and a shared Closet/Outfits long list review.
- Cold wear status, expanded wishlist ranking/decision evidence, and broader fashion/resale integrations.
- Deeper [accessibility acceptance](https://trello.com/c/JlvOXsQJ), [non-drag alternatives](https://trello.com/c/N1aAh0xU), and [mobile scroll edge review](https://trello.com/c/zAVHA49v). The owner considers the bounded 0.4 accessibility pass complete; these are follow-ups rather than new release gates.
- General hosted assistant connection setup and broader hosting provider support. Hosting remains experimental.

Almanac remains after 0.4. Its latest implementation is preserved separately and has been removed from the 0.4 source, together with its Profile routes, menu, city/forecast, and bundled astronomy integration. Existing settings and measurements dialogs remain. Other backlog items are not promises for a particular release.

### Before publication

1. Freeze the exact source candidate and review its final diff, including the latest fixes. Align the user guides and release notes with that package.
2. Run the complete current regression, supported Python, accessibility, dependency, and security checks. Record the exact candidate and any limits; previous checkpoints do not replace this final run.
3. Build and inspect a data-free package and manifest. Confirm fresh installation/import, supported update behavior, and full backup/restore. Hosted candidates also need isolated update/rollback and access protection checks.
4. Confirm the focused owner/physical-phone pass and resolve any blocking defects. Windows/macOS installation and comprehensive accessibility conformance remain unverified unless tested.
5. Review CI and approve publication. Demo updates are separate actions; app updates remain manual unless explicitly authorized for a particular installation.

[Board guide](https://trello.com/c/HCtQ2ZVE) · [Release record](https://trello.com/c/n1dRmgpz) · [Next shortlist](https://trello.com/c/UW6aznwV)
