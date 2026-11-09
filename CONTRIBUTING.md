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

For each UI change, inspect the whole affected section, including what comes immediately before and after it. An isolated control screenshot is not enough. Batch visual checks after a meaningful set of interface changes or a requested review. At that checkpoint, check affected states at 390px, 768px, and a laptop width; shared style changes need all three themes in light and dark appearances. Routine copy or spacing edits need source and synchronization checks, without repeating the browser matrix. Keep immediate checks focused when a specific functional concern requires one.

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
- `app/scripts/tidy-details.js` and `app/styles/tidy-details.css`: `python3 tools/sync_tidy_details.py`
- `app/scripts/lab-pairing.js`: `python3 tools/sync_pairing.py`
- Collections and navigation modules: use the corresponding `tools/sync_*.py` helper.
- Import categories and tag vocabulary: `node tools/sync_import_vocab.js`
- Quiz photos: `python3 tools/sync_quiz_photos.py`, then `python3 tools/sync_profile.py` to synchronize image URLs/crop metadata and quiz source. Image bytes stay in the manifest’s referenced WebP files and load only when the corresponding quiz renders them. Release and static demo builds must include those files; do not embed them as base64.
- Lab season rules: `python3 tools/sync_lab_seasons.py`.

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

### README feature overview

Keep each entry focused on a substantial feature and its main appeal to someone discovering the app. Use a short sentence; leave routine interactions such as skipping, editing, saving, duplicating, and changing selections to the user guide. Avoid small utility functions, control details, and lists of recent fixes. Group related capabilities, and give distinctive experiences such as the Almanac color calendar room to stand out. The README describes the product; release notes explain what changed. Group all features that use an external AI assistant under “Optional: Bring Your Own AI Assistant”, after the main features.

### Release note format

Write for someone deciding what the release adds to their everyday use:

- Open with one short sentence about the main benefits.
- Give the standout new feature its own opening section when it deserves one. Explain its appeal, including what a visualization shows or makes easier to notice.
- Clearly distinguish completely new features from improvements to existing features. A useful default is “New: [main feature]”, “More new features”, and “Improvements to everyday use”; adapt the headings to the release.
- Use short feature bullets with concrete benefits. Include meaningful improvements to forms and everyday interactions, rather than listing only major features.
- Select the most interesting changes. Omit minor implementation details, exhaustive field lists, and fixes to unreleased issues readers probably never encountered. Keep detailed fixes and verification evidence in contributor records.
- Keep optional extras brief and approachable. Short quizzes can be described as fun while explaining how their answers help; a release note does not need a tutorial.
- Keep upgrade instructions brief while there are no external users. Clearly label unreleased notes, and preserve the historical notes for published versions.

## Release preparation

### Current 0.5 scope

The current source includes My almanac and Profile, Comfort zone quizzes, Wishlist preference evidence, seasonal Lab and coverage improvements, outfit naming styles, faithful outfit previews, board editing controls, scheduling, closet tabs, and import/photo workflow improvements. [Draft release notes](docs/RELEASE-NOTES.md) summarize the changes for users.

The latest published release is [0.4.0](https://github.com/stephthegeek/closetlint/releases/tag/v0.4.0). Local implementation, private hosted deployment, owner acceptance, and public release are separate states. Trello holds the working task status; dated verification records belong in the [development archive](docs/archive/DEVELOPMENT-RECORDS.md).

### Verification status

The 8 November candidate checks passed 112 JavaScript and source synchronization commands, 236 tests with supported Python and photo dependencies, fresh installation/import/retry, an isolated update from published 0.4, restart, and full backup/restore with photos. Dependency audits found no known vulnerabilities. The completed accessibility corrections cover 276 theme, appearance, viewport, and interface states with no remaining findings or scan errors in that review; keyboard, onboarding, scheduling, and Wishlist browser regressions also pass. Broader physical-device and manual assistive-technology coverage, and Windows/macOS installation, remain unverified.

The Wishlist performance correction passed the full source/runtime checks and a large synthetic wardrobe browser review. The checked update is deployed to the private review installation with verified record/photo preservation, access protection, backups, and an outside copy. That deployment is separate from public release. The earlier public audit archive predates this correction and is superseded by the final 0.5 package preparation.

Release scope is closed except for confirmed blockers. Final preparation reconciles version metadata, rebuilds and verifies the exact data-free archives, completes the isolated hosted update/rollback check, and runs GitHub CI on the release branch. Keep the release notes marked Unreleased until publication is explicitly approved. Reuse checks only when the relevant source bytes and dependencies are unchanged; record any narrow follow-up checks with their provenance.

### Deferred work

Tailored quiz helper text, improved board browsing on mobile, and discovery of larger original photos are planned for 0.6. Broader manual accessibility review remains deferred; continue fixing concrete regressions. Affiliate work is separate from the software release. Hosting remains experimental. Other backlog items are not promises for a particular release.

### Before publication

1. Settle the candidate scope, review its complete diff, and reconcile the remaining owner review items. Preserve unrelated development work.
2. Run the complete current regression, supported Python, accessibility regression, dependency, and security checks. Record the exact candidate and any limits; earlier checkpoints do not replace this final run.
3. Build and inspect a package without wardrobe data and verify its manifest. Check fresh installation/import, a synthetic update from 0.4, and full backup/restore with photos. Hosted candidates also need isolated update/rollback and access protection checks.
4. Align the version metadata, user guides, release notes, and known limits with that package. Verify final CI and obtain publication approval. Keep user upgrade guidance to backup, code replacement while retaining data, and verification.
5. Verify any requested hosted deployment and demo update separately. Use the existing protected destinations and preserve their data and configuration.

The [published 0.4 release record](https://trello.com/c/UW6aznwV) and [development archive](docs/archive/DEVELOPMENT-RECORDS.md) retain earlier release history.

### Emoji color styling

App-owned decorative emoji follow the selected theme and emoji color preference. Mark standalone or mixed decorative UI text with `data-ui-emoji` so it uses the shared glyph wrapper without becoming an SVG utility. Keep user-entered names and text unchanged (`data-user-content`), and keep native-color exceptions explicit (`data-native-emoji`), including emoji pack previews, full-screen celebrations, and Almanac weather. Filter only the emoji wrapper, never a whole card, photo, field, or colored surface. Check headings, menus, Wishlist evidence/statuses, and all quiz states at a meaningful visual review checkpoint.

### Wishlist gap evidence

Gap counts compare the relevant category (necklace traits use necklaces), include stored and hidden owned pieces, and exclude wishlist, removed, gone, donated, and synthetic pieces. Quiz gaps require a positive answer and recorded matching details. At least 80% of comparable pieces must have relevant details; unknown pieces count as possible matches when qualifying a gap. Zero or one match qualifies directly. Relative gaps require at least 20 comparable pieces, fewer than 10% matching, and at most five matches. A grouped gap chip replaces those traits in ordinary rating chips.

Style expansion requires an established owned Sky reading, an explicit aesthetic tag on the candidate, a curated connection to an owned star with at least three contributors and strength of 0.25, and at least two independent signature evidence families on the candidate. A style already well represented elsewhere in the closet does not qualify. The best quiz gap contributes at most three ranking points; style expansion contributes at most 0.75, with a combined cap of three. A negative quiz signal, missing required layer, or size conflict suppresses the bonus. Saved personal boosts and intentions are unchanged. Run `node tests/wishlist-gaps.js` for boundary, evidence, grouping, and preservation checks.

Wishlist chip selection and display use the same `wrChipPriority` order: up to four available chips, plus a fifth only when its priority is at least 60. This presentation score is separate from purchase ranking. Positive clothing lengths, fit/stretch, sole flexibility, care, and ordinary buttons/zips/slip-on fastenings rank lower; negative utility evidence keeps its warning priority. A mixed group inherits its most interesting trait and shows that trait first. Pockets use the ordinary quiz preference tier, like prints and textures, without a dedicated boost. Lab outfit evidence distinguishes loved (88) from liked (86); mixed counts share one chip, with each distinct combination counted once. Utility-only gap chips do not bypass these rules; explicit top three picks retain extra priority.
