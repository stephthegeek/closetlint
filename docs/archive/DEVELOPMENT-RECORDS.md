# Development records

Historical engineering checkpoints and a later Almanac preview. Dates, test totals, and pending gates describe their recorded work; they are not current release acceptance or installation instructions. Start with [Contributing](../../CONTRIBUTING.md) for current checks and scope.

- [Testing records](#testing-records)
- [Board editor records](#board-editor-records)
- [Performance review records](#performance-review-records)
- [Security review records](#security-review-records)
- [Accessibility records](#accessibility-records)
- [Wishlist analysis reference](#wishlist-analysis-reference)
- [Release planning records](#release-planning-records)
- [Almanac preview](#almanac-preview)

## Testing records

Tests use generated test wardrobes and temporary data folders. Never run destructive checks against a real wardrobe. Passing tests is evidence for the covered behavior, not proof that the app is defect-free or that every platform works.

This is a contributor guide. Recorded results are evidence from specific development builds, not a claim that the latest source or every release passed every check. Test counts, browser limitations, and pending acceptance notes belong to their checkpoints. For installation instructions, see [INSTALL.md](../GETTING-STARTED.md#start-the-app) and the experimental [hosting notes](../WEB-HOSTING.md).

### Cleanup and recurring page headers · 2026-10-30

The three stale JavaScript fixtures now exercise the current behavior: control normalization loads the real icon module and models document fragments/SVG attributes, Sky loads the icon module and provides its canvas Path2D boundary, and Trips tests locate the explicit Add trip action through the current nested header. Their existing behavior checks remain, including SVG normalization idempotence, guarded navigation, and share recovery. The complete 78-command JavaScript/check suite passes after these repairs.

Page title controls now share 44-pixel minimum targets, 14-pixel labels, 500 weight, explicit icon gaps, and wrapping action groups. Changes cover Trips, outfit back/New/actions, batch import/photo headings, Collections, and Sky headings. Titles lead their headers, followed by wrapping actions; outfit previews and the Sky catalog now place their Back action in that same pattern. Existing tabs retain their layout, conditional actions remain hidden, and compact Sky sharing retains its established placement. A Trips heading rule previously applied baseline alignment to both its text and its button group; opting that group into centered actions fixes the SVG/text height mismatch.

Chrome review used a separate test wardrobe at 390, 768, and 1366 pixels. All three themes in light and dark were visually checked on the Trip header; back actions and Add/New controls were compared on Trips, Outfits, and batch pages. Tested import/photo Back navigation, unchanged saved trips, populated outfit preview navigation, and hidden photo restart controls. Header buttons measured 44 pixels with matching font sizes/weights, and the checked pages had no horizontal overflow. Settings and theme-only changes did not touch personal records. Existing automated recovery and Undo suites pass; this pass did not repeat every image-editing workflow or physical device check.

The category picker now shares its used-category snapshot across all category groups even outside a memoized grid render. A focused regression verifies one wardrobe read per picker. Broader Trips/module extraction can wait until after the release review; this cleanup leaves selection/scoring behavior unchanged.

### Category catalog and adaptive visibility · 2026-10-30

The expanded catalog and View settings category tree were checked using a separate test wardrobe. Defaults keep specialist empty choices optional; saved categories stay available despite an off preference, while an unconfirmed import category is retained only in its review picker. Focused tests cover activation, reset, failed-save retention/retry, legacy values, and full backup/restore of preferences, classifications, tags, and wear history. Native select input/change ordering is covered so sweater type defaults cannot overwrite explicit role or layering choices.

Chrome checks covered 390, 768, and 1366 pixel widths, plus mobile screenshots of all three themes in light and dark appearances. Checked search, long labels, populated disabled rows, persisted preferences, focus after saving, category picker escape without changing the selected value, and saved/reopened sweater-vest roles. The search field now uses explicit theme colors, and resetting its search resets the inner scroll position. Hover/focus styles are scoped to this settings section.

The broad JavaScript/check run passed 75 of 78 commands. Previously recorded fixture failures remain in control-emojis (fragment DOM stub), ux-controls (old Trips structure), and sky-ui (missing icon dependency); this is not a clean full-suite result. The supported photo environment completed the Python suite's 169 cases: eight HTTP cases were initially blocked by sandbox socket permissions, and their two affected test modules passed with local-port access (five hosted and four server tests). Import and backup/restore checks passed. No live deployment or personal wardrobe changes were made.

### Hosted photos, update, and rollback · 2026-10-29

A synthetic 64-photo burst behind a briefly pending save reproduced HTTP 503 failures with the former 32-request gateway queue. The bounded queue now accepts 256 pending requests. Hosted cold previews return originals immediately while background generation continues; local preview waiting is unchanged. Failed internal thumbnail image requests get one browser-side retry against the original URL. Original failures do not loop, and remote/static image URLs are untouched. Large-response checks also caught accumulated backpressure listeners; the gateway now removes each listener pair when it resumes.

All five hosted gateway tests and all twelve thumbnail tests pass, including the real optional Pillow/WebP encoder. The JavaScript photo-thumbnail checks pass. The concurrent binary-stream test specifically rejects connection-listener warnings. The reported live thumbnail failures were not captured directly because browser automation was unavailable. The reproduced queue failure establishes one failure path, not the cause of every reported broken image.

The data-free hosted package was exercised over local HTTP with 420 MiB synthetic backups (140 random-pixel PNGs). Baselines were created with the published 0.2 storage code and with the preceding hosted package’s storage code, covering backup formats 1 and 2. Checks compare records, tags, individual wear dates, retained deleted-outfit history where supported, unfinished trips, board state, and every photo hash. They cover restart, atomic wear and retry, stale save refusal, full export/restore, and rollback into a separate pre-update copy while retaining the newer backup. This establishes the tested rollback procedure; it does not promise arbitrary in-place downgrades.

Both 420 MiB baseline scenarios also passed through the package's private pipe on SiteGround, using separate synthetic folders. No personal records or live deployment settings were changed. The bulky hosted test data was removed after preserving the reports. See [hosting](../WEB-HOSTING.md) for the repeatable command and manual deployment checklist. Public dashboard deployment, password protection after a new deployment, and idle restart are separate acceptance checks not completed in this pass; a local gateway or hosted pipe result cannot substitute for them.

#### Public hosted follow-up · 29 October 2026 (Pacific)

A fresh SiteGround test project passed an update from the prior hosted package using a database created by 0.2, followed by rollback to the prior package and a separate restored pre-update database. The newer test data remained separate. Public HTTPS checks covered atomic wear/retry and stale save refusal, 64 concurrent cold photo previews, and a 420 MiB backup download. Restoring that downloaded backup preserved records, board state, and all 140 photo hashes.

Whole-site password protection continued to block signed-out app, API, photo, and backup requests after another deployment. After the test worker was observed stopped during idle, an authenticated browser visit started a new worker and recovered the saved calendar and board. A calendar day dialog at 390 pixels showed the individual-piece logging helper without horizontal overflow. The main installation was then updated, its saved content matched the pre-update backup, and all 38 images in the checked calendar month loaded. A fresh backup was verified and copied off-host. These checks establish this maintenance procedure on the tested setup; they do not change SiteGround’s stated lack of support for Python child processes or establish compatibility with other providers.

### Stale browser saves · 2026-10-28

Record and board writes use content-version preconditions checked inside the SQLite write transaction. `test_stale_writes.py` covers two editors, stale deletion, old-tab rejection, creation collisions, exact lost-response retries, independent records, direct-tool changes, and simultaneous connections. `runtime-conflicts.js` covers retained unsaved edits/layouts, closing warnings, same-tab queued edits, conflict retries, and old-backend protection. Existing restart and autosave recovery checks remain passing. The full supported Python suite passes (159 tests).

Real Chrome checks used two tabs against a disposable synthetic wardrobe: one saved size L, the older tab's size S was rejected and stayed in the open editor, and storage retained L. A separate board check retained the first tab's saved name/layout while the old tab kept its unsaved board and displayed the conflict. No personal wardrobe was used. Conflict recovery requires reviewing a fresh tab; it does not merge or force old edits over newer saves.

The wider JavaScript run also found pre-existing fixture failures in control-emojis, trip-export, ux-controls, and sky-ui; these involve their DOM stubs/function extraction, not the changed save boundary. They remain outside this fix. Record the focused passing checks and these limits rather than claiming a clean complete JavaScript run.

### Run the automated checks

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

HTTP handler tests use in-memory connections. They do not replace a listening server test. JavaScript VM tests do not verify native dialogs, focus behavior, rendering, or mobile keyboards.

### Browser and device checks

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

### Recurring UI layout review

For each UI change, inspect the whole affected section, including what comes immediately before and after it. An isolated control screenshot is not enough. For layout and control changes, visually check the affected states at 390px, 768px, and a laptop width. Shared style changes need all three themes in light and dark appearances.

Use this same checklist each time:

- Give headings, helper text, fields, action rows, and images distinct space. Use a container gap for a sequence of related blocks; do not depend on default paragraph margins. Aim for 12px between helper text and actions, and 16–24px between sections unless an established component specifies otherwise.
- Give icons and labels an explicit gap, usually 8px. Leading spaces in text do not create reliable spacing in flex layouts. Center the icon and label vertically, and retain the control's intended horizontal alignment.
- Check short and wrapped helper text, long names, wrapping button rows, and both expanded and collapsed sections. Watch for uneven gaps, cramped labels, overflow, and controls pressed against container edges.
- Keep button surfaces distinct from fields and disclosure rows. Check selected, disabled, hover, and keyboard focus states, and ensure swatches, images, and icon shapes do not gain unintended background tiles.
- Keep reading, tab, and action order coherent as controls wrap. Check that all actions remain reachable above mobile navigation and within scrolling dialogs or toolbars.
- Exercise the relevant save, Undo, Cancel, and retry paths when controls are moved or reworked. Use synthetic data, and preserve the working board.

Report which layouts and states were actually reviewed, and any checks that remain unverified. This is a focused review of affected screens, not a requirement to repeat every app flow for a copy change.

### Keeping embedded sources synchronized

The served HTML contains embedded copies of several maintained source files. After editing one, run its sync tool:

- `app/styles/themes.css`: `python3 tools/sync_theme_styles.py`
- `app/scripts/categories.js`: `python3 tools/sync_categories.py`
- `app/scripts/setup.js`: `python3 tools/sync_setup.py`
- Collections and navigation modules: use the corresponding `tools/sync_*.py` helper.
- Import categories and tag vocabulary: `node tools/sync_import_vocab.js`

The existing tests check relevant synchronization and source invariants.

### 0.1 candidate verification

The release branch excludes Sky. The development build and dev site retain it; checks of those builds do not establish that Sky is part of 0.1.

Completed on the candidate:

- GitHub Actions passed the full JavaScript suite, 53 Python tests, dependency advisory checks, public-source checks, and full-history Gitleaks scanning. Actions are pinned to commit revisions.
- A separate Python 3.10 CI job passed core runtime tests and sample initialization, startup preparation, and backup export without optional packages. The full suite also runs on Python 3.12.
- On Linux with Python 3.14, a freshly extracted ZIP started a listening server without site packages. Its manifest matched its files, and its source contained no embedded wardrobe or Sky modules.
- A browser downloaded a full sample backup containing 12 photos, a saved outfit, and a working board. Cancelling restore preserved a sample edit. Confirming restore reproduced the backed-up catalog, collections, and board exactly; the automatic recovery snapshot retained the replaced edit. Updated extracted source reopened the same data successfully. This checks source replacement, not a general future-version migration or downgrade guarantee.
- Browse-title padding and theme typography were checked at 390 × 844 and 1300 × 900 across all three themes in light and dark. Lab accessory labels, shoe preservation while accessorizing, and positive-first My Taste ordering were checked with synthetic data.
- A read-only performance pass used an existing 1,100-piece wardrobe at 390 × 844 in desktop Chrome. Search, category filtering, scrolling, and board-tray search responded without a visible stall. Browse mounted 60 cards plus its loading sentinel rather than the whole wardrobe. This was a bounded observation, not a hardware benchmark or physical phone test; long board-tray and Lab lists remain future optimization work.
- The optional photo worker uses direct U²-Net/ONNX inference and Pillow 13 or newer. A synthetic setup rehearsal and inference check passed previously, and the mask matched the former implementation without changing RGB pixels. The latest dependency advisory checks passed; a fresh optional-tool installation was not repeated during the final recovery pass.

The passing source/security and minimum-Python jobs are recorded in [this CI run](https://github.com/stephthegeek/closetlint/actions/runs/39668276536). Changes after that commit need their relevant checks.

Still open before tagging: StephTheGeek’s final physical-mobile workflow pass and resolution of any blockers it finds. Windows and macOS installation, broad assistive-technology coverage, and an independent human security audit have not been completed. State these limits in release notes rather than implying every platform or workflow has been certified.

See [the security review](DEVELOPMENT-RECORDS.md#security-review-records) for security boundaries and residual risks.

### Internal algorithm versions

Algorithm versions are independent of the app release and storage schema. Update the relevant version and behavioral regression tests whenever scoring or selection changes.

- **Lab selection 2.2.0:** sweater vests get a suitable underlayer unless an explicit standalone role or layering requirement overrides it. Pullover/cardigan/vest types stay under Sweaters. Top, bottom, and one-piece subcategories in optional workwear and cultural clothing branches use those Lab roles; ambiguous sets receive no inferred role. Unspecified sweater types remain unchanged. Version 2.1.0:  manual laundry availability now filters clothing, anchors, and accessories when Ready to wear only is active, including in Fantasy mode. This does not rewrite ratings, wear evidence, or wishlist compatibility. Version 2.0.0 introduced the following variety behavior; earlier selection was unversioned. Learned taste now uses transferable patterns rather than direct piece-ID rewards, with a reduced preference weight. The eight most recent distinct rated/skipped outfits contribute a soft piece-reuse penalty. Candidate signatures are deduplicated, and 20% of selection weight explores compatible outfits without taste weighting. Explicit anchors are exempt from the reuse penalty; minimum compatibility, blocked pairs, and already-rated/seen combinations remain enforced. Newly generated candidates and ratings made from them carry `algorithmVersion`; older/manual outfits remain unversioned rather than being relabeled.
- **My Taste summary 2.0.0:** earlier summaries were unversioned. Shows up to three positive observations, two passed-on patterns, and three repeat-loved pieces; ranks supported patterns ahead of tiny perfect samples and combines observations backed by the same outfits. Individual outfit examples remain paginated.
- **Sky formula 2.0.0:** tracked by `app/content/sky/scoring.json` and exported `scoringVersion`. No Sky scoring behavior changed in this Lab batch, so its formula version remains unchanged.

### 25 October release review

The 25 October review refinements add consistent piece-header toggles, white default board backgrounds, grouped outfit/design actions, layout-change confirmations and recovery, bounded My Taste summaries, Lab variety, and saved-outfit toolbar refinements. The full release JavaScript suite and all 94 synthetic Python tests pass after this batch. The proposed separate outfit-preview page and persistent draft switching are deferred until after 0.2; opening a different outfit still uses the existing unsaved-work confirmation. Final physical device and cross-theme acceptance remains pending.

### 0.3 candidate preparation

The approved scope is Sky and the daily fortune, plus the completed performance/structure review. The development checkpoint passed the full JavaScript suite and 101 supported Python tests. Focused checks passed after mobile retry-label and Fantasy mode CSS fixes. Synthetic browser checks covered URL-first startup, bounded outfit cards, board failure/retry, reload, New/Undo, representative themes at mobile and desktop widths, and opening Sky’s share preview. They did not verify a downloaded share image or the extracted 0.3 package.

Sky remains formula 2.0.0, and daily readings remain algorithm version 1; release preparation does not change their selection behavior. The deferred mobile transport stall reproduced with independent synthetic servers and remains unresolved. Windows/macOS installation and physical phone acceptance remain open. Historical 0.1/0.2 exclusions above apply to those releases only; 0.3 includes both Sky and daily-fortune assets.

- **Wishlist analysis 2.1.1:** `WISHLIST_ANALYSIS_VERSION` tracks compatibility/overlap evidence only; personal ranking and Lab/Sky algorithms are unchanged. See `WISHLIST-ANALYSIS.md` and `tests/wishlist-analysis.js`.

### Laundry and care development checks · 26 October

`tests/laundry.js` covers wardrobe-level opt-in, failed settings/status saves and retry, explicit Fantasy-safe Lab pools, accessory eligibility, partial batch selection/retry, accurate changed/unchanged counts, field-aware Undo with later edits preserved, wear/status independence, saved care-note loading, care-upload locking through field/photo refreshes and failure recovery, and care-photo main-view fallbacks. `tests/board-tray.js` also verifies cleaning eligibility, explicit inclusion, and status retention when tracking is disabled. `tests/modal-toast.js` covers native-dialog hosting, nested close, queued-close/reopen races, and detached-node recovery. The existing gallery, navigation, board, and bulk-edit checks remain in the full JavaScript suite.

Synthetic Python checks cover import selection when a care label is first or the only image, validation, and full backup round trips retaining laundry settings/status, care text, and reference photo bytes. Browser checks use only the isolated synthetic installation: desktop, 390-pixel, and 502-pixel widths; shared activation; care upload with unfinished fields preserved; save/reopen; gallery restrictions; in-modal removal/Undo; closet filtering; explicit batch Ready action/Undo; saved-outfit notices; and board/tray/Lab availability. Physical device touch and release acceptance remain separate.

The laundry/care review repeated synthetic Chrome checks at 390, 700, 820, and 900 pixels across representative light/dark themes and text-only actions. Injected single-toggle and Undo write failures both recover through Retry. Cleaning and Undo update the board tray/notice while retaining placed pieces; newly unavailable Lab pieces are replaced, and the Lab override does not disable the board filter. Care save/reopen and photo upload preserve entered values. Care upload/top status controls now meet the 44-pixel minimum height. The full JavaScript suite passes; this review adds no selection algorithm changes or physical device acceptance.

### Sky, sharing, and daily-fortune review · 26 October

`tests/sky-ui.js` now covers pending-export deduplication, layout/filename consistency, null/throwing encoders, unsupported/throwing/rejected native sharing, cancellation, recovery, and closing during encoding. `tests/daily-card.js` covers stale cached reminders for hidden/removed/donated/wishlist/missing pieces, stored Do reminders versus valid stored neglected favorites, preservation of same-day reveal/dismissal choices, and failed persistence retaining session state with accurate feedback. Scoring/generation versions are unchanged.

The full JavaScript suite and four `test_sky*.py` checks pass. Bounded synthetic Chrome checks use 390-, 700-, 820-, and 900-pixel frames, representative light/dark themes, text-only Sky controls, and the smallest fortune grid density. Downloaded Square (1080×1080) and Story (1080×1920) images were inspected, superseding the earlier checkpoint’s unverified-download limitation. Native phone share UI is simulated in automated tests; physical phone and extracted-package acceptance remain separate.

### Trips save/recovery review · 26 October

`tests/trip-save-state.js` covers detached settings/checkmarks, failed packing autosave/retry, serialized writes with newer edits retained, explicit-save snapshots and title preservation, stable creation retry IDs, packing edits during first Save, independent trip timers, discard cancellation, in-flight navigation blocking, and latest-record deletion/Undo with restore failure/retry. `tests/url-navigation-app.js` also checks that first Save adopts the saved trip URL and that route navigation cannot abandon an in-flight trip write. The full JavaScript suite passes.

Bounded Chrome checks use an isolated synthetic SQLite wardrobe at 390, 700, and 900 pixels across representative Soft Hardware dark, Field Notes light, and Night Bloom dark/text-only layouts. Verified packing progress after reload, autosave versus unsaved details, injected explicit/autosave/delete/Undo failures and recovery, delayed-save navigation, title edits during a write, restored packing checkmarks, date/transport layouts, aligned mobile actions, and independent full-card/Delete targets. No personal trips were touched. Earlier wizard saving, physical device acceptance, and final extracted-package checks remain outside this review.


### Wishlist evidence review · 26 October

`tests/wishlist-analysis.js` verifies independent color/aesthetic/occasion evidence, narrowly defined similarity, recorded cardigan/layer pools, mixed-palette neutrality, latest Lab ratings per combination, positive context retained from other combinations, distinct valid recent wear dates, inactive-piece exclusions, and read-only analysis. Wishlist analysis 2.1.1 corrects the evidence without changing ranking or Lab/Sky algorithms. `tests/wishlist-photos.js` also covers keyboard details versus accidental picks, live-record hydration without replacing valid pairs, and the existing fallback when a comparison member becomes unavailable. Existing Pass persistence/failure/Undo and purchase-move tests pass, as does the full JavaScript suite; theme checks pass after the final CSS adjustments.

Bounded synthetic Chrome checks cover 390-pixel Soft Hardware dark, 700-pixel Field Notes light, and 900-pixel Night Bloom dark/text-only layouts. Ranking/Compact/comparison views retain wrapping without horizontal overflow; relevant small controls have 44-pixel targets, and comparison actions clear mobile navigation. Enter and Space open details without a rating; saving changed colors refreshes evidence while keeping the displayed pair. No personal wardrobe data was used. Physical phone acceptance remains separate.


### Direct import setup/handoff review · 26 October

`tests/test_assistant_import.py` covers authorized-only installation metadata, invalid batch IDs, no installation paths in served app HTML or access tokens in copied requests, missing photo tools, reusable setup evidence and folder changes, wrong-wardrobe rejection in setup/status/preview/apply/retry, preview versus committed receipt, original saved counts after unchanged retry, full backup compatibility, missing-folder CLI errors, and quoted Unix/PowerShell commands. `tests/setup-flow.js` covers gated setup, separate direct/file contracts, readiness, pending IDs, missing receipts, failed checks, mismatches, retry, saved counts, and existing unsaved-edit refresh guards. `tests/runtime-session.js` covers renewed tokens, fixed destination, read-only status, deadline cancellation, and retry. The full JS suite and all 111 Python tests pass at the checkpoint; focused checks pass after final refinements.

Fresh-context rehearsal: an assistant with no inherited conversation received the actual setup request copied from the synthetic browser UI. It ran the supported check without extra installation hints. After the UI verified that check, it received the actual import request plus two supplied synthetic photos with known ownership and unknown sizes/prices/material/dates. It independently read the schema, prepared the local batch, previewed, applied, and verified two pieces/two photos. An unchanged retry returned already-applied with zero new additions/photos; the original receipt remained two/two. The browser checked that receipt, reopened the pending batch after reload, and loaded the two pieces. No personal wardrobe was used.

Bounded Chrome checks cover 390-pixel Soft Hardware dark, 700-pixel Field Notes light, and 900-pixel Night Bloom dark/text-only layouts, wrapping installation paths/commands, local Claude and ChatGPT/Codex guidance, reused setup, new batch identity, and an injected server-check failure/retry. A fresh context in this agent environment was tested; actual Claude clients, Windows/macOS execution, and physical phone touch acceptance were not. PowerShell command quoting is unit-tested, not a Windows installation certification.


#### 0.3 shared import sources checkpoint (2026-10-26)

- Synthetic staging coverage: authorized upload/read/update/remove, wardrobe identity, filename/path/symlink protections, file types and sizes, immutable-source checks, repeat upload after a lost response, retained photo guidance, and direct import from staged paths with a verified receipt.
- Browser import coverage: stable source IDs resolve only in the selected batch, returned JSON reuses the original, photo-choice failures retain edits, source upload alone creates no piece, and completed batches start fresh. Existing ZIP/JSON and older multi-photo imports remain covered.
- Full JavaScript suite passed; 115 Python tests checked with the configured Python 3.12/Pillow environment. Three socket tests initially blocked by sandbox networking passed when rerun with localhost access (four-test socket suite).
- Visual checks used the actual upload picker with two synthetic photos, reloaded the app to verify retained notes, and inspected 390px, 760px, and 1280px layouts in Field Notes light and Workshop dark. Mobile guidance spans the card width; laptop cards use two columns. No personal wardrobe test entries were added.
- These checks verify handoff construction and importing, not the quality/availability of a provider's image-generation tool. User testing with a fresh local Codex/Claude session and actual photos remains useful before release.


#### Direct import follow-up (2026-10-26)

Focused setup-flow checks cover the host connection label, OS-specific path placeholders, quoted Windows paths, provider-neutral editor access and permission fallback, canceled reloads leaving Done enabled, and pending-save flush failure preventing reload. Seven assistant-import tests check the authorized installation metadata, including the host platform. No algorithm scoring changed.


#### Tidy photos main-view follow-up (2026-10-26)

Tidy selection now resolves only the piece's current main photo, including AI recasts, independently of gallery insertion order. Focused tests cover newer alternates, a selected main cutout, a missing legacy main entry, remembered skips, and a main-photo change during review. The latter blocks stale save/skip actions while preserving a retryable review. Tidy dialog, photo gallery, and photo preview/save tests pass. This was checked in code and synthetic handlers; no real wardrobe photos were processed for this fix.


#### Bulk import tagging review (2026-10-26)

Full JavaScript unit suite passed. All 25 focused Python tests passed in the configured Python 3.12/Pillow environment: piece import (14), shared sources (4), and assistant setup/receipts (7). Added coverage checks common tagging instructions across five source types and both routes, labeled/scoped vocabulary, supported tags retained by file parsing/record creation, and a committed direct import retaining tags, a recast main photo, its original, and Unreviewed status. Embedded setup and vocabulary synchronization and diff whitespace checks pass. This copy/contract update had no new visual browser pass; a fresh assistant run with the revised prompt and an actual returned file/ZIP remain acceptance checks.


#### File route browser acceptance (26 October / 27 October UTC)

An isolated synthetic installation exercised upload → file request → returned ZIP → review/tag edit → injected first-record write failure → retry → saved results → reload → duplicate update/skip. The request contained tagging guidance and source IDs without private host paths. Two originals were reused from staging; a new recast test fixture became the tee's main photo. The saved records retained the edited occasion tags, aesthetic/season fields, unknown sizes/prices, and mixed owned/wishlist status. Retry reused already uploaded photos; repeating the portable file updated one existing piece, skipped the wishlist match, and added no records/assets. A separate one-piece failure fixture verified the corrected Save paused heading and Finish without adding action. Three final synthetic records and four assets account for both fixtures.

Visual inspection covered 320px Workshop dark, 390px Field Notes light, 760px Field Notes light, and 1280px Workshop dark. Checked loaders, upload guidance, review fields, duplicate comparisons, recovery, footer alignment, and horizontal overflow. Full-width name fields and wider-spaced category fields were rechecked at 390px and 760px. Button targets in mobile review/recovery were at least 44px high. Focused setup/flow, ZIP, import images, matching, and theme tests passed after the fixes; embedded setup synchronization and diff whitespace checks passed. This was browser-width QA with fixture files, not physical device testing or a new AI-provider/image-generation trial.


#### Calendar dialog overflow (26 October / 27 October UTC)

A synthetic installation with short and long saved-outfit names verified the calendar day dialog at 390px and 1280px in Field Notes light. Selecting the long name leaves scrollWidth equal to clientWidth (355/355 and 419/419). The Log it row wraps when needed; no overflow-hiding rule was added. The scheduling chooser also fits at 390px with the long name. Checked the renamed Schedule a saved outfit action and title; no plan/wear writes or personal data. Focused theme, saved-outfit, Trips-navigation, and app-routing tests pass. Wider calendar wear/save/recovery acceptance remains a separate final review item.


#### Calendar board handoff · 2026-10-26

`tests/calendar-board.js` exercises full preservation of the previous board, failed pre-switch checkpoints, leaving and resuming dated drafts, one-record outfit/date writes, failed writes and successful retries, response loss followed by draft reload, failed final autosave, and edits arriving during saves. The retry fixture models the runtime's global flush rejection while a failed outfit record is outstanding. Route integration checks blocked menu/Back navigation during Save & schedule.

Synthetic Chrome on an isolated installation at 320/390/760/1280 pixels verified Create from a future day, readable mobile Save & schedule, injected outfit-write failure followed by successful retry and return to that day, original-board recovery, Back without scheduling, and dated-draft restoration after reload. Light Field Notes and dark Workshop show no page overflow; the narrow tray retains its intended local horizontal scrolling. No personal data, physical phone, external weather lookup, or fitness integration was used.

Final validation for this change: the full `npm run test:unit` suite, board/theme source synchronization, and `git diff --check` pass. Synthetic SQLite verification confirms one scheduled outfit/date after the failed-write retry, the later dated draft remains unscheduled, and original board text/layout/background remain intact.


#### Continuing imports · 2026-10-27

`tests/test_assistant_import.py` now covers 61 prepared rows across two parts (60 additions plus a cross-part duplicate), immutable retry receipts, request totals/next-part/cursor, needs-input → continuation → complete, sequential part validation, destination mismatch, completed-request rejection of new parts, unchanged retries after completion, zero-result completion, CLI preview/apply/outcome commands, tag retention, and full backup restore. Source choices persist without uploads, and a saved part alone does not complete a request. Existing piece-import/source tests pass: 29 focused Python tests total.

Setup-flow tests cover blank/explicit/invalid limits, all-source tagging/manual-photo-splitting instructions, partial/zero/complete result states, continuation without a setup loop, and next-file saves retaining staged original references with distinct write identities. The full JavaScript unit suite passed, followed by focused setup rechecks for subsequent UI refinements. Embedded setup sources and git whitespace checks pass.

Synthetic Chrome used an isolated wardrobe with 55 additions in two committed parts and an explicit needs-input outcome. Reopening restored the original store/date scope without uploads; Continue opens the continuation request with tagging and part commands intact. Check import changed to complete while keeping the aggregate totals, and Start another import reused setup with an empty limit. Dialog and body scroll widths matched client widths at 390, 760, and 1280 pixels in Field Notes/Workshop light/dark; mobile footer targets remained at least 44 pixels. A setup-loop issue and buried partial results were fixed during this check. No personal data or real assistant/email scanning was exercised.


#### Import preparation choices · 2026-10-27

Setup-flow tests cover both preparation flags across five sources and two routes, all four combinations of record/photo behavior, global/photo-specific inheritance and opt-outs, final chat-declared choices, limits/tagging instructions, separate same-link variants, file fallback notices, and direct receipt fallback summaries. Photo work flags/notes are excluded from saved garment metadata. Request/source tests verify flag persistence without uploads. Python photo tests add a three-color beanie fixture sharing one original, distinct variant matching, idempotent retry, recast-first main selection with original retention, notice metadata isolation, and malformed flag/oversized-note rejection. Full JS plus 31 focused Python tests passed, with focused setup rechecks after UI/copy refinements.

Synthetic Chrome verified 390-pixel selected controls and generated instructions, a three-piece saved direct receipt explaining unavailable editing, reset choices for a new request at 320 pixels, email/file-route options at 320, and no horizontal overflow at 320/390/760/1280 across light/dark Field Notes/Workshop. The supported CLI previewed, applied, retried, and finished the three-beanie fixture: three records, one shared original asset, then zero additional records/photos on retry. Actual AI-generated photo quality and provider-specific approvals require separate acceptance checks; no personal data was changed.

#### Existing three-pack beanies · 2026-10-27

An authorized check against three existing variants of a multipack verified duplicate handling and manual photo replacement. Both preparation options appeared in the generated direct request, alongside common tagging and explicit duplicate protection. Three built-in image-editor outputs were visually checked against the original pack photo. The supported import preview/apply matched all three existing variants and added zero pieces; retry returned already-applied. Because duplicate imports preserve existing photos/tags, the individual outputs were added through each existing piece’s Photo options, labeled AI recast, and made main. This verifies the repeat safeguard and the existing piece editor, rather than claiming the importer updates duplicate photos automatically.

Saved-state checks confirmed the original record IDs, unchanged tags/ownership/price notes, three distinct recast main photos, original pack photo retention, unchanged piece count, and unchanged board. Chrome showed all three individual photos together. Recovery and verification artifacts were kept outside the public source. The run exposed and fixed successful recasts receiving a contradictory missing photo note, and recognized photo-work fields incorrectly appearing as unknown-field warnings; all 16 piece-import tests pass with regression assertions.

#### Mobile file import with both preparation options · 2026-10-27

An isolated local wardrobe exercised the file route in Chrome at 390 pixels: selected both options, uploaded the pack photo, checked that its individual-photo choice inherited the global selection, and verified the generated request included splitting, photo editing, and common tagging. Loaded a real ZIP containing three tagged beanies, three previously generated individual product photos, and the shared original. Review showed three ready pieces, loaded previews, both views per piece, and retained tags. One Add 3 pieces action saved all three without opening piece pages. Saved-state checks confirmed distinct recast main photos, original retention, color/season/occasion/aesthetic/pattern/material tags, and Unreviewed status. At 320 pixels, loading the same ZIP found all three existing pieces; updating them kept exactly three records and their photos. Dialogs had no horizontal overflow; footer controls remained 44 pixels high and wrapped cleanly at 320 pixels.

The actual upload response exposed an inheritance bug: server defaults reset the requested per-photo edit flag. The client now preserves its role, edit choice, and steering text while accepting saved upload metadata, including a lost-response retry. Focused setup-flow tests pass with regression coverage. The Your closet settings group now hides empty save-status space, uses consistent checkbox spacing, and includes the requested fortune-card/laundry wording. Chrome verified the 390-pixel settings group with no overflow.

#### Setup spacing and outfit scheduling · 2026-10-27

Focused setup, setup-flow, themes, collections, calendar-board, and outfit-flow checks pass. Added behavioral checks for photo readiness success/unavailability/error/retry and simple scheduling failure/retry, preserved legacy event metadata, no inherited weather/location for new schedules, and the View calendar callback. The existing setup-flow matrix covers source/route variations, optional limits, repeat imports, tags, split packs/product photos, and graceful photo fallback.

A synthetic local store was used for Chrome checks at 390 and 1280 pixels: setup step separation, compact selects, compact closet checkboxes, and the unavailable photo tools status. At 390, scheduled a synthetic saved outfit for November 4, then used the toast's View calendar action and verified the planned event on that day. No personal wardrobe data was changed. Trips spacing was checked in source only; physical phone acceptance remains separate.

#### Release preparation · 2026-10-27

The full JavaScript suite and all 122 Python tests passed using the supported Python 3.12/Pillow environment. The release spot check then found and fixed wear logging accepting failed piece writes: no outfit success is recorded until all piece saves succeed, duplicate taps share an in-flight operation, and an open-tab retry preserves which dates it added. Removal retains its outfit log when a piece removal fails, allowing retry without removing independently logged dates. Regression coverage also covers an outfit-record failure after piece saves. These are multiple writes, not an atomic cross-record transaction; keep the tab open to recover partial wear saves. Saved-outfit details also remain open when their commit reports failure.

Current source preflight selects 199 allowlisted files, including the Sky share-copy source and referenced board/wishlist documentation. The machine-path scanner permits only the literal placeholder /home/yourname/ used in Linux path guidance; real machine paths remain findings. The lockfile advisory audit reports no vulnerabilities. Exact candidate hashes, extracted-package verification, optional Python advisory results, and secret-scan results belong in the candidate CHECKS.md sidecar. This source note does not certify CI or an unbuilt production archive.


#### Release documentation review · 2026-10-27

Re-read the rc.2 README, release notes, installation/update, onboarding, assistant-import, and photo guidance against current behavior. Source corrections cover the old installation folder example, missing laundry summary, user-controlled wishlist order, direct versus file import, optional pack/photo preparation, image-editor limits, and ordinary versus dated/import recovery. Checked relative Markdown links in all 199 selected public-source files: no missing or unpackaged targets. Source preflight and whitespace checks pass. This documentation-only pass does not repeat the already passing full regression suites or replace rc.2; these changes enter the next candidate.

#### Approved public garment sizes · 2026-10-27

All eight synthetic public-export tests pass in the supported Pillow environment, including explicit garment-size opt-in, default omission, manifest opt-in consistency, and exclusion of body measurements and personal fit profile. Focused navigation/native-link checks, source preflight, and whitespace checks pass. The first test invocation used the system Python with an outdated Pillow; rerunning in the configured photo environment passed. The development-demo update used an approved source-ID mapping to add recorded sizes while retaining the previously published photos and other records. The stable demo remains unchanged.

#### Size-filter cleanup and Add label · 2026-10-27

Missing sizes, non-sized pieces, and one-size pieces now use the same classification for counts and filtering. The old earrings-only No size shortcut is removed; Not applicable follows explicit non-sized records and non-sized categories. Ring/gauge/clothing/shoe missing values are distinguished from recorded sizes, per-piece fits-like sizes, and explicit one-size kinds/aliases. Adjustable/open rings share One size; older specific one-size selections remain matched and normalize into the shared choice during filter rendering. Synthetic regression coverage exercises actual filter results and OR combinations. Focused controls, add-menu, themes, navigation, and app-routing suites pass. Chrome checks at 390 and 1280 pixels verified all three labels/counts, actual mobile result lists, and the Add button in text-only mode. No personal wardrobe changes or button reordering were made.

#### Final candidate backup regression · 2026-10-27

Exact rc.3 browser acceptance exposed a backup-validation failure after the daily fortune card persisted its installation identity. The general hexadecimal-string scan mistook that identity for a photo asset. Validation now checks explicit photoId fields, legacy photo-map entries, and catalog bundles, including photo fields in board drafts, while leaving unrelated IDs and text alone. A regression test reproduces the HTTP backup failure and verifies a full restore of daily-card state and all assets; missing piece, care label, legacy-map, and bundle photos still block restore. All 23 focused core-runtime tests pass. The failed rc.3 archive remains unpublished and is superseded by a fresh candidate; its pre-browser storage roundtrip alone did not expose the issue.

#### Corrected final candidate acceptance · 2026-10-27

The extracted 0.3.0-rc.4 package passed the full JavaScript suite and all 125 Python tests, fresh core startup without optional packages, a synthetic published-0.2 update, and full backup roundtrips. After daily-card state persisted, the actual browser-downloaded backup previewed and restored at 390px, retaining the catalog, complete board, records, and 12 exact photo byte hashes. Square and Story PNG downloads were verified on disk at 1080×1080 and 1080×1920; their bytes match the visually inspected outputs. Chrome checks at 390px and 1280px showed restored photos, outfit history/plans, and fitting dialogs. Source/secret checks and GitHub CI passed on the corrected source. Physical-phone/native-share acceptance remains separate; production packaging changes only version and documentation.

### Batch workspace migration (0.4 candidate)

Repeat imports and Tidy photos use routed pages, retaining the existing direct/file contracts and save operations. Synthetic checks cover Back/Forward and closet-context recovery, untouched boards, save-time navigation guards, file-review reload after partial saves, stable retry IDs and committed-write reconciliation, separate Getting started, ready-cutout recovery, interrupted preparation, photo-source changes, and save/skip retries. The draft helper checks retained Blob bytes and remapped URL caches, wardrobe isolation, write ordering, storage failure/retry, and close-page protection.

Chrome review used an isolated synthetic wardrobe at 390px, 768px, and 1280px across Soft Hardware, Field Notes, and Night Bloom in light and dark. Checked one/two/three-column photo grids, wrapped names and instructions, expanded direct-setup paths, file review, filter targets, and footer clearance. Fixed chooser spacing, 768px navigation overlap, and horizontal overflow from old dialog header margins; the final page scroll widths match client widths. Review filters and relevant action controls have 44px minimum targets. A real three-piece ZIP retained its edited name and photos through navigation/reload; an injected partial-save failure recovered after reload with exactly three additions and distinct photos. Photo review retained its cutouts and selected choice through Back/reload; an injected photo-save failure retried without duplicate uploads, continued to the remaining five photos, and returned normally. Saved-state checks confirm retained color/season/occasion/aesthetic tags, original-photo retention, exactly five total fixture assets, and an unchanged working board. Background removal used a synthetic response; physical phone touch and actual model processing are separate checks. Screenshots were retained as local review artifacts and are not included in this repository.

#### Atomic wear actions

Run `node tests/atomic-wear.js`, `node tests/calendar-board.js`, `node tests/data-history.js`, and `python3 -m unittest discover -s tests -p test_atomic_wear.py -v`. Use synthetic records to verify that adding or removing an outfit wear entry commits all piece dates and outfit history together. Reject a stale final record and simulate a storage failure after writes: neither may leave partial dates. Retry a lost response with the original versions and identical payload; never overwrite a newer edit. Independently logged piece dates and dates shared with other outfits must remain. Check public-demo storage quota failure too. Single-piece logging remains a separate action, and success appears only after saving.

### Trips overview review · 29 October 2026 (Pacific)

The overview now highlights the next plan, previews existing pinned or suggested outfits, counts assigned trip days, and groups upcoming, undated, and past plans. The actions disclosure contains existing edit and delete actions; the trip wizard and stored planning model are unchanged. Wider use of these menus on mobile thumbnails remains a discussion item.

Checked in Chrome with a separate 12-piece test wardrobe at 390px, 768px, and 1366px, including all three themes in light and dark appearances, long names, an outfit suggestion, plans without dates or previews, and expanded action menus. Outside-click and Escape dismissal, event edit/Cancel, event creation and deletion, trip deletion/Undo, dated calendar navigation, and browser Back passed. A stopped local test server produced a failed-save message without removing the event; the same action succeeded after the test server resumed. The working board retained its two pieces.

Focused overview, trip navigation/save recovery, export, Undo, calendar-board, native-link, URL navigation, mobile-helper, theme synchronization, and inline JavaScript syntax checks passed. Two older test fixtures were updated to load current startup dependencies and async print helpers; production export behavior was not changed. This is a local development check, not a release or hosted deployment.

### Trip Fairy steps 2–3 · 29 October 2026 (Pacific)

The Days & bag and Include steps now use dated day choices, night-out and travel-day toggles, calendar-event previews, optional automatic basics, and one Bringing for sure editor. Named setup on these steps uses the existing stable-ID save/retry path automatically; building a named trip saves the resulting plan. New controls use defaults for older trips, including wearing bulky pieces for bags and packing them for a car trunk. Existing dates, names, saved plans, and activity requests remain available.

Focused tests cover dated slots, laundry, events, individual overrides, explicit extras, room estimates, purchase/pull groups in exports, night-out serialization, queued edits during saves, failure/retry, discard, navigation, and Undo. Chrome checks used the separate test wardrobe at 390px, 768px, and 1366px, with all three themes in light and dark appearances. Checked day-menu placement, outside/Escape dismissal, item/outfit/collection pickers, removal, rebuilding, and reopening. The test built five requested outfit slots while retaining eleven explicit pieces, omitted automatic basics when disabled, and kept two wishlist pieces in To buy. Its existing event, wear history, and two-piece board stayed unchanged. Physical phone checks and deployment are separate.

### Trip Fairy packing page · 29 October 2026 (Pacific)

Page 4 uses day cards with a separate night-out choice, per-slot idea cycling, pin/unpin, bulk pinning, and reshuffling that preserves pinned outfits. Only pinned outfits contribute clothing to the list; explicit additions and enabled basics remain included. Older plans retain the selections that previously contributed to their packing list. The shared trip summary replaces the repeated name/Save card, and packing changes, exclusions, and basic choices autosave through the existing retry path.

The screen and exports use the same categorized snapshot. Added packed counts, list tools, reset/Undo, reversible item exclusions, and basic quantities/selections with thumbnails. Zero basic quantities stay out of exported rows and can be chosen again. Existing swap, board, collection, weather-note, and optional export controls remain accessible.

Focused results, save/retry, legacy/default handling, navigation, export, collection, Undo, and theme checks passed. Chrome checks at 390px, 768px, and 1366px covered all themes in light and dark appearances, suggestion cycling, unchanged pinned photos after reshuffle, pin-the-rest, checkmark reset/Undo, item removal/Undo, quantity changes, export controls, and reopening. The test retained its original event, wear history, and two-piece board. The sample has no eligible underwear photos, so the browser exercised the chooser's missing-item/quantity path; selected basic IDs and exclusions are covered in isolated tests. Physical phone checks and a new print-dialog/export-device round remain separate. Nothing was deployed.

#### Outfit toolbar review — 29 October 2026

The outfit count now sits beside the Outfits tab, and New outfit uses the existing protected board reset and Undo. Search, quick filters, panel-only filter counts, and sorting share a wrapping toolbar; Needs tags is inside Filters. New oldest, wear-count, and name sorts retain the existing sort options.

Focused outfit, board recovery, theme, native-link, and navigation checks passed. Chrome checks used the separate test closet at 390px, 768px, and 1366px, covering all three themes in light and dark appearances, expanded filters, zero results, count/badge updates, and New outfit confirmation, navigation, and Undo. The original two-piece test board was restored. Personal closet data and hosted deployments were untouched.

Trip results follow-up: Planning notes has an inset body, result toolbar actions share a 44px height, and warning confirmations retain contrasting colors across the six theme/appearance combinations. Checked 390px, 768px, and laptop layouts in the isolated test closet, Cancel in the reset confirmation, and pinned changes saving and surviving reload. Trip failures now retain the storage error reason. The local LAN server was restarted against its existing data folder after verifying it was still serving the pre-versioned-write backend; its storage integrity passed. The user's open draft tab was not reloaded or discarded.

### Setup spacing and hosted guidance · 30 October 2026

The optional photo tools disclosure now has inset padding around its shaded surface. Getting started uses numbered, wrapping step buttons with an accessible current-step marker and the trip wizard’s control sizing. Photo tool messages refer to the wardrobe service and its hosting computer or server. Assistant-import documentation distinguishes browser ZIP uploads from direct imports over approved SSH, including remote path and source-attachment boundaries. Existing setup-flow, setup, ZIP, and theme checks pass; embedded setup sources and whitespace checks pass. No new visual browser pass or fresh hosted assistant rehearsal was performed for this edit. Oracle’s direct-assistant route still uses local-only instructions and needs a separate hosted handoff review; its downloadable context route remains the portable option.

#### Card menus and browse context · 30 October 2026

Shared overflow menus now cover piece, saved-outfit, and collection cards. Focused card-menu, collection, navigation-integration, and theme tests pass, including fresh action values, viewport clamping, single-menu behavior, keyboard dismissal/focus, failed removal/Undo retry, and collection history restoration. The category section is first beneath Filters in both sidebar and phone sheet. All/Closet/site-title navigation clears collection selection; opening a piece and returning retains it.

Chrome checks used only the separate test wardrobe at 390px, 768px, and 1366px. Collection menus were reviewed in all three themes, light and dark. Verified piece Donate/Undo, collection Remove/Undo, collection edit/Cancel, outfit details/Cancel, keyboard End/Escape, and aligned outfit action rows without horizontal overflow. Existing export and outfit recovery tests passed; an actual image download was not repeated in this pass. Hover selectors were inspected, but a dedicated pointer-hover pass and physical phone acceptance remain pending.

#### Recent wears and hosted prompts · 30 October 2026

Recent wears derive from distinct valid past/today wear dates. Tests cover inclusive thirty-day windows, 3/8-day thresholds, DST/leap boundaries, duplicate/invalid/future dates, preservation of legacy values on writes, no wishlist heat, rapid clicks, failed saves, archived/live outfit linkage, and date rollover without repeated same-day redraws. Individual Today toggles retain the existing piece save path; outfit-linked dates open the existing day detail. Saved-view and navigation capture include the heat filter. No recommendation scoring or backup format changed.

Chrome used only the isolated test wardrobe at 390px, 768px, and 1366px. All three themes in light/dark had fitting strips, visible bars, and 44px action targets. Checked 8→7→8 live heat changes, Very hot filtering, retained Unreviewed filter and piece notice, and a newly logged outfit’s Today button opening grouped day details without deleting the piece date. Browse badges replace the former unreviewed question-mark slot. Owner/physical-phone review remains pending.

Oracle’s hosted route now identifies server paths and approved SSH access, retains identity checks and read-only scope, and defaults to file downloads even with a previous setup marker. Import prompts use computer/server wording. Synthetic browser-flow checks cover hosted route selection and copied requests; Python tests cover hosted metadata, scoped files/photos, identity mismatch, access controls, and unchanged wardrobe bytes. Eleven assistant-import and six Oracle backend tests pass. This pass did not deploy to or execute a new assistant request against the live hosted wardrobe.

The JavaScript checks passed after repairing two fixture dependencies on the former card-menu implementation. Daily fortune no longer applies the bright hover/active inset ring; keyboard focus remains visible. Sky’s catalog hint is right aligned beside the perspective tabs and wraps at phone widths.

Piece-card overflow sizing follow-up: the … overlay now matches each theme’s existing heart/board control size (36px Soft Hardware, 34px Field Notes, 30px Night Bloom). Desktop resting controls are hidden; card hover, keyboard focus, and an open menu reveal them. Touch controls remain visible with an expanded invisible hit area. Browser checks confirmed sizes in all three themes, desktop opacity, hover/menu opening, and Escape focus return. Theme and card-menu tests pass.

Eyewear follow-up: Intermediate replaces Computer in current choices/import vocabulary while preserving legacy values, saved-view identity, filter selections, and Lab preferences. Explicit old Sunglasses values normalize to the Sunglasses subcategory; transitions retain their ordinary eyewear classification. Focused category/size/Lab and import vocabulary checks pass. The broader image-import suite is blocked in the available test environment by the existing Pillow minimum-version check; the focused category/eyewear import test passes. No live personal records were written during the separate canonical category audit.

Wear-strip correction: the visual strip shows ten days, using the same eight-pixel rounded segments and spacing as the existing trip progress bars. Heat still uses thirty days and keeps the two orange levels. Focused wear tests pass.

Setup category selection: the four-step wizard reuses the saved category chooser. Focused setup/category checks cover defaults, protected populated categories, persistence, failure/retry, and Back/Continue navigation. Isolated Chrome checks at 390px, 768px, and 1366px across all three themes in light and dark found no dialog overflow. Category rows retain 44px targets, and a changed choice survived reload. Personal wardrobe data and hosting were not changed.

Metal & finish: optional grouped tags appear for jewelry, watches, and bags, while Tops stays unaffected. Existing material values and unknown saved tags remain editable. The import schema and both assistant prompt routes use the expanded vocabulary without adding universal colors. The complete JavaScript unit suite and all 171 supported Python tests passed. Isolated Chrome verified save/reopen, clearing the test tags afterward, and 18 layouts (390px, 768px, and 1366px across all three themes in light/dark) without dialog or tag-panel overflow. No personal records were changed.

Calendar day modal: widened to 800px with compact clickable photo/name rows, full-piece thumbnails, shared secondary menus, and separated logging/footer controls. The shared menu mounts inside native dialogs and returns to the page on dismissal, including when opening a piece replaces the dialog. Focused card-menu, calendar-board, recent wear, outfit-flow, theme, mobile, dialog, and icon checks pass. Isolated Chrome checked 390px, 768px, and 1366px across all three themes in light/dark; no horizontal overflow and 44px menu targets. Verified Escape/focus return, a test piece date removal surviving reload, saved-outfit opening, scheduled-event edit/Cancel, and direct piece opening while another menu was open. No personal data or hosted deployment was changed. Physical device review remains separate.

Calendar representative pieces: focused thumbnail tests exercise mixed clothing/jewelry, top/bottom/layer combinations, accessory-only and rings-only days, specialty clothing, reversed catalog order, and unmodified inputs. Actual calendar rendering verifies the selected four pieces, saved and planned outfit compositions, and singular/plural hover/accessibility labels on + badges. Thumbnail, calendar-board, and recent wear suites pass. This changes selection only; no CSS, personal data, or hosted deployment was changed.

Trip sleepwear correction: focused wizard/results tests cover generic lounge tops, lounge trousers, robes, explicit pajamas/nightgowns, named sleepwear, and wishlist exclusions. Added generic loungewear retains the sleepwear reminder; added owned sleepwear avoids its duplicate row. Trip wizard/results/export and packing-room suites pass. No personal records, saved category keys, or hosted installation was changed; this code/copy correction did not add shared styles.

Wardrobe-aware trip defaults: focused regressions cover no bras versus wishlist-only, owned-but-filtered bras, explicit choices, cover-up-only and top-only wardrobes, trunks-only swimming, complete sets, partial set coverage, and preserved legacy activity overrides. Outerwear alternatives include ponchos/vests; tagged formal flats outrank untagged heels. Tights absence avoids a personal shortage claim. Ten focused trip/category/weather/packing suites pass. Isolated Chrome generated and saved a four-day test trip, pinned its suggestions, chose an activity top, and verified the choice after reload. New rows and choosers fit 390px, 768px, and 1366px without overflow. No shared styles, personal records, or hosted deployment changed.

Generalized trip basics defaults: tests cover each underwear subtype alone, mixed underwear sharing one quantity, no automatic groups for empty inventory, wishlist-only categories, owned-but-filtered categories, and retained explicit choices across underwear/bras/socks/sleepwear. Generic lounge-only closets do not create sleepwear requirements. Focused wizard, results, export, save/recovery, and packing-room checks pass. No shared CSS or hosted/personal data changed; this source behavior/copy follow-up did not repeat browser layout checks.

User documentation pass: simplified setup/import/Oracle/photo/navigation/theme/hosting guidance, separated published 0.3 notes from the 0.4 draft, and added a concise Trips guide. Checked local links/anchors, command options, JSON schema output, and Markdown fences. A temporary documentation-check source archive verified 241 manifest hashes and all 74 packaged local documentation links. Added the public adapter files to the source allowlist; its documented hosting-package command succeeded from that extracted archive and its manifest hashes passed. These are documentation/package-membership checks, not full release acceptance, a hosted deployment, or a new security audit.

### Profile and daily almanac · 2026-10-31

The JavaScript/check suite passes, with additional focused Profile navigation, measurement-entry, and almanac checks after the final interaction fixes. All 175 Python tests pass using the configured Pillow 13 environment and local socket permission; the system Python run initially failed because it had an older Pillow and sandboxed sockets. No product dependency requirements were relaxed.

A disposable wardrobe with synthetic records and fictional demo photos was reviewed in the in-app browser at 390, 768, and 1366 pixels. The almanac was checked in all three themes, light and dark, at laptop width. Tablet now stacks the cards below the calendar to avoid cramped trip details. Checked complete affected sections, selected/missed/today/future swatches, wrapped trip text, badge wrapping, and menu title/dot/gear alignment. Found and fixed a generic empty-state CSS collision that stretched today’s ring, menu focus opening a flyout on launch, and hidden desktop size options. Explicit sizes, gaps, and scoped classes keep controls separate from fields and images.

Browser actions verified size persistence, expanded More choices remaining open after saving, a new measurement, a missed-day atomic piece wear, Celsius badges, disabled future days, exported month PNG, and existing Sky/Back navigation. Focused route tests cover cancelled unsaved Profile tab changes and unchanged working board. Forecast failure, malformed requests, and validated city time zones have synthetic service tests. Physical device behavior, live deployment, and live-wardrobe acceptance remain unverified; all browser writes were confined to the disposable wardrobe.

#### Profile polish follow-up · 2026-10-31

Calendar swatches render at 85% of their former diameter inside unchanged day slots. Profile text actions now have hover/focus feedback, small trailing arrows, and native gear emoji that survive control normalization. Settings and Sizes & fit share a centered width; fieldsets retain rounded shared surfaces and explicit helper spacing. The city field and Find city action share one row, followed by the helper, status, and selectable suggestions. The piece picker follows the existing dialog heading, search, row, and footer conventions.

City suggestions now debounce typing, reject stale responses, and handle a trailing uppercase region code before Open-Meteo can interpret it as part of another city name. A local server running the old imported lookup module was returning coordinates without time zones; this is now reported as an outdated service instead of “no city found.” Focused city, icon, navigation, measurement, dialog, and atomic wear checks pass. Review uses the disposable wardrobe; local-server reload verification checks that records and board remain unchanged.

### Profile text and navigation polish · 31 October 2026

Calendar labels now match Sky’s 12px small labels, and the legend uses 13px text. Profile tabs have padded hover surfaces, with compact spacing that fits all three tabs at 390px. The card is named Style Sky, Settings begins with the storage explanation, and outfit/board actions include emoji.

Opening a recently loved outfit or My taste now calls the existing Lab initializer before setting its destination. This fixes first-entry rendering without changing Lab scoring or the almanac selection algorithm. `tests/profile-navigation.js` covers first entry, existing preferences, and unavailable pieces. Focused almanac, taste, control-emoji, settings, and URL-navigation checks pass, along with profile source synchronization.

Browser review used a synthetic wardrobe: loved thumbnail and Explore destinations, Settings note order, calendar and tabs at 390px, 768px, and laptop width, and all three themes in light and dark at laptop width. The final phone check confirms all three padded tabs fit. Full device and assistive-technology checks were not repeated.

### Accessibility checks

Run `npm run test:a11y` for real Chromium scans of a disposable sample wardrobe across all three themes, light/dark appearances, and phone/desktop widths, plus keyboard and narrow-screen reflow checks. CI runs this after the existing tests. Install the locked packages with `npm ci --ignore-scripts` and the browser with `npx playwright install chromium`; `CHROMIUM_PATH` can select an installed Chrome.

The findings, resolved fixes, and deferred mobile scroll edge flags are recorded in [the accessibility report](../../CONTRIBUTING.md#accessibility). The regression gate rejects new findings, worsening measured contrast, or scan errors; the baseline does not mean those existing failures pass accessibility. `npm run test:a11y:strict` fails on any automated finding. `npm run test:a11y:report` reports all findings and interaction results. Do not refresh the baseline automatically to make a failure pass; remove resolved entries when fixing issues.

Before release, also check keyboard-only use of editing/dragging controls, focus visibility and return, 200% text sizing, reduced motion, meaningful image descriptions, and a screen reader pass. Automated scans cannot establish full WCAG conformance.

Accessibility follow-up: all confirmed initial findings are resolved in the checked development states. The full 276-scan matrix plus a final 12-scan board check leaves only the explicitly deferred mobile color-chip scroll edge flags. All 31 keyboard/reflow checks pass, including actual Tab-to-Remove after selecting a piece, board geometry across reload, and mocked city lookup/save/focus. The mobile chip inspected is 40px tall and fully clickable after scrolling; no target sizes or footer layout changed. Fixed findings were removed from the regression baseline.

Shared accessibility preferences: 162 real-browser checks across three themes, both appearances, and 390/768/1366px verify skip navigation, hover/focus parity, focused-button text contrast, CSS reduced motion, and forced-color focus/selected indicators. These run through `npm run test:a11y`; `node tests/accessibility.js --preferences` runs them separately. Full operating system and screen reader and text-enlargement acceptance remains tracked on Trello and in ACCESSIBILITY.md.

### Tablet styling pass · 31 October 2026

Used a disposable 12-piece test wardrobe in Chrome at 768px and 1024px. The initial 46 page/dialog captures covered Browse, piece/Add forms, outfits and preview, calendar/day details, board, Lab, wishlist, Trips, Sky/catalog, profile/settings/sizes, imports, Tidy photos, Oracle, setup, collections, and the menu. Reviewed spacing, alignment, wrapping, and page overflow. The unavailable photo-service state was checked; populated photo-processing/recovery states and built trip results were not repeated.

A follow-up covered 108 rendered states: eight tablet views (including expanded outfit filters, Lab controls, board tools, and Trip days/Include) in all three themes, light/dark, at both widths with touch input, plus 12 mouse-input Browse variants. Representative screenshots were visually reviewed across the six theme/appearance combinations. All captured states had no horizontal document overflow or capture errors. Mouse-input Browse checks included a three-digit favorite count and found the sort/direction controls aligned after the fix.

Fixed one clear layout defect: at intermediate mouse-input widths the Browse sort-direction button could wrap onto a line by itself. From 821–1100px, the toolbar now places search/count above a row containing sort, direction, and the existing action buttons. Clear filters gets its own row when shown. The touch layout and phone target sizes are unchanged. Theme tests, embedded style synchronization, and whitespace checks passed. This was a browser-based layout pass, not physical-tablet or exhaustive workflow acceptance. No personal wardrobe or hosted installation was changed.

Board autosave status follow-up · 31 October 2026: routine pending/saving/saved and unsaved-outfit messages use a reserved inline slot, with the collapsed mobile Board tools heading sharing that status. Detailed failures and Retry remain visible. All 18 synthetic Chrome cases (three themes, light/dark, 390/768/1366px) retained the same board position during and after delayed autosaves; mobile cases also checked collapsed tools. No horizontal page overflow. Save/retry, autosave, and theme tests pass. Removed the Outline control’s text effect; Shadow remains unchanged. No hosted deployment or personal records changed.

Initial board-piece fit · 31 October 2026: freehand additions now cap both photo width and height for the current board shape and reserve 16px around the photo for resize controls. Ordinary category sizing remains the starting preference. Existing pieces and saved layouts are not resized. Placement regressions cover every board shape, narrow/wide boards, tall/wide photos, invalid aspect fallback, and populated boards. Synthetic Chrome with a very tall test piece confirmed the piece and resize handle fit and that resizing works without rotation at 390/768/1366px. Board tray, autosave, workspace, embedded-source, and whitespace checks passed. No personal records or deployment changed.

Desktop Other drafts placement · 31 October 2026: the recovery chooser sits beside the naming row; its desktop options overlay the tools without moving the canvas. Mobile retains the existing disclosure below the name. Twenty-four synthetic Chrome layouts covered three themes, light/dark, and 390/768/1024/1366px; alignment, open-menu bounds, and desktop canvas stability passed. A separate draft-resume/reload check passed. Focused recovery, save-state, theme, embedded-source, and whitespace checks passed. No personal records or deployment changed.

AI workflow preferences · 31 October 2026: photo preparation and Oracle remember explicit route choices separately, scoped to the wardrobe identity and local/hosted mode. Missing, invalid, or blocked preference storage retains the existing defaults; remembering a choice does not grant or verify access. Imports retain their existing route preference. Photo review shows a shared green confirmation only after prepared results are received. Photo-preparation, Oracle flow, and setup/import tests, embedded synchronization, and whitespace checks passed. No hosted deployment or personal records changed.

Board crop/Remove follow-up · 31 October 2026: processed-photo cache keys now include the actual photo address, avoiding stale originals when crop/replacement asset IDs have equal lengths. Remove uses native click activation for both pieces and text; pointer presses on nested icons bypass dragging and pointer capture. Active cut-out gestures end before removal. Straighten was removed; rotation snapping remains unchanged. Regressions cover same-length source replacement, cut-out/background cache separation, mouse/touch icon and keyboard removal, Undo, and autosave. Fresh synthetic Chrome wardrobes at 390px (touch) and 1366px (mouse) passed piece-page crop → board refresh → pointer removal/re-add with the crop retained, plus text removal/Undo. Photo-gallery, board-workspace, embedded-source, and whitespace checks passed. An initial combined fixture let restored test text cover a later control; final runs used separate wardrobes. No personal data or deployment changed. Unified chronological Undo is deferred beyond 0.4 by the owner.

### Today’s Sky order, previews, and exclusions · 31 October 2026

Today’s Sky now precedes trips. Explicit `?almanacPreview=1` mode cycles eligible current-date readings on refresh or Next preview, without writing saved daily history. Focused almanac tests verify eligible candidate cycling, stable redraws, reload counters, and zero preview-history writes. Selector 1.1.0 shares the daily-card eligibility predicate and excludes those pieces from color evidence and all candidate families; the bump invalidates older saved readings. Almanac, daily-card, Profile navigation, and embedded-profile synchronization checks pass. No browser layout review was repeated for this order/copy/debug change; local visual feedback remains the next checkpoint.

### Today’s Sky browser-scope fix · 31 October 2026

The daily-card module is lexical inside the portable app closure, not exposed on the global object. Almanac now resolves the shared eligibility rule from that lexical scope. The new browser-context VM regression encloses the real daily-card and almanac sources together, verifies the daily module remains private, and executes both normal and preview selection. Existing almanac/exclusion/preview checks and embedded-source synchronization pass. No algorithm behavior/version change is needed for this scope correction.

### Today’s Sky product thumbnails · 31 October 2026

Piece-based readings now resolve their referenced live piece and show its photo using the existing thumbnail URL helper, contained photo treatment, and optional piece background. The image opens current piece details; missing pieces and absent/placeholder photos omit the thumbnail. Text and image sit side by side with an explicit 18px gap, stacking with a 14px gap on narrow screens. Ranking and saved daily cards remain unchanged. Almanac tests cover photo URL selection, accessible naming, piece-detail action, missing pieces, and non-piece suggestions; selection, preview, exclusions, browser-closure, and source synchronization checks pass. Visual review is deferred to local feedback for this code-first iteration.

Packing-list PDF · 31 October 2026: a supplied photo inclusive Letter PDF contained a trailing page with only browser headers/footers. Reproduced the same empty-page pattern by adding an invisible trailing text node after the named packing sheet, using wrapped four-photo basics rows and 90% print scaling. Moving the named-page assignment from the sheet to the printing body keeps the complete print document on one page layout; the reproduction now has two content pages instead of three pages. Chrome PDF checks also passed with photos and outfit combinations independently enabled/disabled on Letter and A4; the final content page was rendered and visually checked. Focused trip-export, theme/synchronization, and whitespace checks passed. No hosted deployment or wardrobe changes.

Narrow mobile review · 31 October 2026: checked 320, 360, and 390px touch viewports, including all three themes in both appearances at 320px. Covered saved outfits and expanded filters, outfit preview, collection actions/Oracle/editor, piece wear strip, expanded board controls and text editing, calendar day details, Trips and Include, wishlist, imports, category setup, optional photo tools, prepared-photo handoff, and lower Almanac sections. Across 192 rendered states (including focused repeats), no document-width overflow or unclipped off-screen controls were detected. The initial matrix used fallback fonts; 80 follow-up states confirmed the loaded IBM Plex Mono font and included representative visual review across themes. Two test selectors were corrected and the affected states rerun. The collection Oracle label now reads “Talk to Oracle about this collection” and can wrap; reduced inner setup-tab padding prevents an orphaned step number at 320px while preserving control dimensions. Collections, setup/import, and theme tests passed. Evidence: wrapper outputs/mobile-{new,extra,final}-2026-10-31. This is emulated browser review, not physical device or on-screen-keyboard acceptance; no hosted deployment or personal data changes.

0.4 documentation reconciliation · 31 October 2026: draft notes and README now include the implemented My almanac/Profile scope. Added a concise Almanac guide and updated current Settings/setup/export/photo-resume labels and guidance; retained detailed Profile behavior in its contributor reference. Release planning separates implemented scope, deferred work, completed review evidence, and outstanding exact-candidate/publication gates, replacing the stale blanket owner-review queue. Historical published notes remain unchanged. Source-package inspection and local Markdown-link checks passed, including the new guide’s explicit package membership. These checks do not establish final package or publication approval; no app behavior or deployment changed.

Documentation scope correction · 31 October 2026: the owner confirmed Almanac remains outside 0.4. The preceding documentation reconciliation incorrectly inferred release scope from its presence in the working tree; its Almanac inclusion claim is superseded. Removed that claim from the release draft and planning record. Folded the newly created Almanac guide and existing Profile contributor reference into ORACLE.md with Style Sky and Linty’s daily card, clearly labeling Almanac as a later preview, and removed ALMANAC.md from source and the package allowlist. The release gate now explicitly requires separation of the preview and review of related Profile/menu changes. No application code was removed or changed by this correction.

## Board editor records

This is a contributor reference. The validation notes record individual development checkpoints; test counts and pending checks describe those passes, not the latest release status. See [release notes](../RELEASE-NOTES.md) for current scope and [testing](../../CONTRIBUTING.md#testing) for checks to run.

The board uses plain JavaScript and the existing portable app closure. Editable modules are embedded into `app/closet-lint.html`; they are not separately fetched at startup. This is a maintainability and state-safety change, not a framework migration or a bundle-size optimization.

### Source ownership

| Source | Responsibility |
| --- | --- |
| `app/scripts/board-session.js` | Whole-board transitions, independent document copies, draft persistence/recovery, saved-outfit identity, and Save/Save a copy |
| `app/scripts/board-editor.js` | Board/tray rendering, selection controls, pointer gestures, cutout interaction, and toolbar wiring |
| `app/scripts/board-collage.js` | Collage geometry, slots, replacement/swap interaction, and layout recovery |
| `app/scripts/board-design.js` | Board appearance, text, palette strip, arrangement, decoration, and image export |
| `app/styles/board.css` | Base workspace, piece, collage, style-control, palette, and decoration CSS |
| `app/styles/themes.css` | Skin-specific and cross-component overrides, including mobile toolbar presentation |

Run `python3 tools/sync_board.py` after changing board modules or base CSS, and run `python3 tools/sync_theme_styles.py` after changing theme CSS. The normal JavaScript test suite checks board synchronization; theme tests check their embedded source. Embedded block positions retain the original load and cascade order.

### State contract

`state.board` is the sole active, mutable editor document. `state.outfits` contains saved records, and the runtime's recovered/persisted board is a storage snapshot. These objects must not share mutable piece, cutout, text, or style arrays.

- `adoptBoard` is the single whole-board assignment path. New, Open, recovery, Lab handoff, and whole-board Undo use it. It refuses replacement during a pending outfit save and resets piece/text/palette/slot selection, cutout mode, collage replacement/swap state, and active arrangement/design recovery controls. It updates the existing router's linked-outfit compatibility flags and the title field.
- `copyBoardPieces` copies supported placement fields, including independent cutout points. `boardDocument` adds detached metadata for draft storage and recovery.
- `mapPiecesForDoc` creates a detached, rounded placement snapshot for saved outfits. Save retains the captured board identity, existing saved-record wear/planning information, and the protection for names typed during an asynchronous write.
- Opening a saved outfit creates a separate editor copy. Save updates that outfit; Save a copy creates another saved identity. New and its Undo retain the existing confirmation and recovery flow.
- Ordinary gestures mutate only their captured active document. Piece, cutout, palette, text, and collage callbacks check board and pointer identity before acting. A delayed collage long-press cannot create an overlay after another board is adopted, and stale pointer completion cannot persist the replacement board.
- Design and deletion Undo keep their existing board-reference guards. Saved records are written through the existing storage adapter, not by editor rendering.

### CSS cleanup and scope

Base board styles now have one editable component source with sections for layout, collage, style controls, decoration, and accessory suggestions. A redundant overridden declaration was removed, and adjacent identical mobile media blocks were merged without moving their rules. Final selector/property values and media conditions were compared with the pre-change sources and remain identical. Skin-specific overrides are retained deliberately; flattening that larger cascade requires its own design review.

### Validation

Both full JavaScript suites pass, including session, board workspace, navigation, outfit, theme, Sky, and daily-card coverage where present. Both full Python suites pass in the supported photo environment (97 baseline-tree tests and 101 development-tree tests). Focused session tests use the actual source module and cover detached copies, saved-record isolation, transient reset, pending-save replacement guards, owning-pointer edits, stale events, delayed collage callbacks, and listener cleanup.

A separate synthetic Chrome installation was used to save, update the same outfit, start New, Undo New, and reload the linked board. The 390-pixel iframe viewport retained its white board background, pieces, title, and controls. This is a responsive desktop-browser check, not physical phone touch verification. No personal wardrobe was edited. CSS-only final cleanup was additionally checked by declaration comparison and the existing theme suites.

### Follow-up review

- The app still shares its closure-level `state` object. These modules make ownership visible but do not introduce a new application-wide state store.
- Rendering and draft commits are now separate (see the explicit autosave audit below). Keep new edit/Undo paths covered by action-level persistence tests; never reintroduce saving into a painter.
- Explicit outfit save operations and runtime draft status now drive save feedback (see Save status and recovery below). The navigation compatibility flag remains; wider application state is still shared.
- Saved outfit links now open a preview. Edit switches through the persistent workspace checkpoint described below.
- Conservative CSS consolidation and the combined synthetic theme/save-state checkpoint are complete; see `PERFORMANCE-REVIEW.md`. Deeper cross-selector restructuring, physical phone gestures, and enforced performance budgets remain follow-ups.

No Lab, My Taste, or Sky scoring/selection algorithm changed, so their versions are unchanged. Published 0.2 and the stable demo are unchanged.

### Explicit draft autosave (2026-10-25)

`renderBoard()` now paints without saving or mutating the board document. Collage window counts and the legacy zig/wave frame alias are calculated for display. Navigation, selection, photo-color refreshes, and draft recovery do not schedule a draft write.

Edit handlers call `persistBoard()` before repainting. It captures a detached document and delegates the existing 200 ms debounce, serialized writes, retries, unload protection, and backup flush to the runtime. An optional captured-board argument rejects stale async/gesture owners. This does not change the distinction between draft autosave and the explicit Save outfit / Save changes action.

| Mutation boundary | Persistence coverage |
| --- | --- |
| Pieces | Add/remove from closet, tray, collections, or Lab; flips, frame toggle, stacking order, and cutouts |
| Design | Style changes, collage conversion/layout/windows/gutter, crop/zoom, replacement/swap, and arrangement |
| Text and palette | Add/remove text, content, font, alignment, color, effects, and positioning |
| Gestures | Move/resize/rotate, collage pan, and completed cutout; unchanged clicks do not save |
| Session and metadata | Name, suggested title, favorite/details, Open, New, saved identity after Save/Save a copy, and Lab handoff |
| Undo | Piece/text deletion (toolbar, toast, and keyboard), design, layout/crop/cutout, arrangement, title, New, and Lab handoff |

Gesture completion saves the final visible position on pointer-up, cancellation, or lost pointer capture, once. A cancelled/lost-capture cutout leaves the shape unchanged. Callbacks cannot write after their board or edited object has been replaced.

`tests/board-autosave.js` exercises real action handlers with saving disabled in the render stub, then checks each stored snapshot. It also checks repaint/recovery isolation, interrupted gestures, stale callbacks, edits during Save, failed Save, linked metadata, reload, and persistence despite a repaint failure. Navigation tests distinguish opening a different outfit (an explicit persisted transition) from revisiting the current board (paint only). Runtime tests retain failure/retry and backup-flush coverage.

This pass uses synthetic automated tests; no new interactive browser or physical phone check was performed. Published 0.2 and the stable demo are unchanged.

Validation for this pass: both full JavaScript suites passed, and the supported Python suites passed (97 baseline-tree tests and 101 development-tree tests). Embedded-source checks and `git diff --check` passed.

### Save status and recovery (2026-10-25)

The board now displays separate persistent draft and outfit status, with explicit retry buttons after errors. Draft status reports pending, saving, retrying, failed, and saved states from the runtime. Outfit status distinguishes saving, failure, edits newer than the saved outfit, and an up-to-date outfit. Save buttons disable during the operation, expose a busy state, and identify a failed copy retry.

`state.outfitSave` owns the explicit save operation's board, target ID, copy/update intent, phase, and error. `setOutfitSave` is its transition point; `boardSaving` remains a compatibility guard for existing navigation and destructive actions. A weak map retains per-board operation state within the open tab. New and Undo New now require any failed outfit save on the active board to be retried first, matching the existing workspace-switch guard. Failed saves leave the editor intact. Retry reuses the target ID and takes a fresh snapshot, so an accepted request with a lost response does not create a second outfit or copy. Edits typed during a pending save remain in the editor and draft, with a notice that those newer edits still need Save changes. Failed board favorite updates also retain the intended value.

The runtime exposes draft status subscriptions and manual retry. One draft write is in flight at a time; acknowledging its older snapshot cannot mark newer queued edits saved. Existing debounce, bounded automatic retries, reconnect retry, unload protection, and backup flush are retained. Failed record writes are tracked by record path: retrying that record clears its failure without clearing unrelated failures. UI status subscriber errors cannot break storage.

Operation/retry identity is retained in the open tab, not a new persisted schema. Error copy explicitly asks the user to keep the tab open. No schema or algorithm change, and no change to the separate draft-versus-saved-outfit model.

Both full JavaScript suites passed, including new failure/status tests, and both supported Python suites passed (97 baseline tests, 101 development tests). Synthetic tests cover lost responses, stable copy identity, latest-edit retries, duplicate clicks, failed favorites, New/Undo status recovery, synchronous failures, unrelated record failures, and in-flight draft edits. No new interactive browser or physical phone visual check was performed.

### Saved-outfit previews and kept drafts

Saved outfit URLs (`#/outfits/ID`) show a preview with Edit outfit, Wore it, and Export image. The active editor remains at `#/board`; preview navigation and exports never adopt or save an editor document. Image rendering takes a detached document and passes it to background, frame, palette, and collage helpers so asynchronous rendering cannot read a different active board.

Edit outfit checkpoints the current workspace before switching. Failed checkpoints retain the current board. Failed explicit outfit saves must be resolved before a switch, preserving their retry identity. Reopening an outfit for editing resumes its kept edits if present; explicit Save changes still updates the saved outfit. Other drafts lists the retained boards by name; Resume switches to the chosen board. The post-switch toast also offers a shortcut to the previous board. New outfit also keeps the prior draft alongside its existing confirmation and Undo. Empty boards are not retained as drafts.

The optional board `workspace` member has version 1, an active key, a previous key, and an array of detached draft documents with timestamps. It travels through normal board autosave, reload, and full backup/restore without changing saved-outfit records or the archive format. Kept drafts with different edits are retained without automatic eviction. Snapshots whose editable content exactly matches a saved outfit are removed automatically when recovery is rendered or an outfit save succeeds. Saving adopts the outfit workspace key; leaving an unchanged saved outfit does not create another draft. Equality covers the name, supported placement/crop fields, text, design, and outfit metadata, ignores saved IDs and timestamps, and tolerates object-property order. Failed saves do not resolve recovery drafts. Clean linked outfits no longer also display “Draft saved”; unfinished boards show only “Autosaved.” Earlier app versions may drop this additional workspace member when saving a board, so keep a current backup before rolling back.

Checks: full JavaScript suite, synthetic repeated switches/reload/failure and detached-export checks, and 102 Python tests including workspace backup/restore. Bounded synthetic Chrome verified preview rendering, edit/checkpoint, confirmed autosave/reload, returning to original work, collection links, and 502-pixel collection actions. Physical phone gestures and exhaustive theme coverage were not repeated.

Mobile board background permits vertical page scrolling and pinch zoom. Pieces (including text), collage slots, and palette overlays retain direct manipulation. Cut-out mode temporarily captures canvas gestures until it finishes or is cancelled. Background touches still clear selection without cancelling native scrolling.

The Add pieces to board picker mounts 60 thumbnail buttons initially, then appends batches while scrolling. Load more pieces provides a manual/keyboard fallback. Filters cover the whole closet, reset the mounted batch, and reject stale observer callbacks. See `tests/board-tray.js`. Progressive loading does not evict previously viewed thumbnails.


### Compact board header (2026-10-26)

The name and Save action come first on desktop and mobile. A single metadata row holds concise save feedback and Other drafts (N). Removed the separate Draft/Editing label, repeated save explanations, and duplicate persistent Return to previous work button. Other drafts expands to named Resume actions and disappears when no recoverable boards remain. Its summary uses a centered flex layout and the same 44-pixel touch target as the other controls.

Routine status is Autosaved for a working draft, Saved for an unchanged saved outfit, or Unsaved outfit changes when an explicit outfit save is still needed. Empty boards show no routine status. Pending writes, autosave failures, explicit-save failures, and both retry actions remain visible as needed; normal success text is suppressed while autosave reports a failure. Draft retention, matching-snapshot cleanup, save retry identity, and switching behavior are unchanged.

Validation: JavaScript save/recovery tests cover the shortened states, empty boards, and access to every named recovery entry through one control. Synthetic Chrome verified the collapsed and expanded mobile layout at 390 pixels in light Workshop and dark Field Notes, plus desktop positioning. No personal wardrobe was edited.


### Background removal from the board

Selecting a freehand piece or filled collage window exposes Remove background when its main photo can be processed by the local runtime. It checks local-tool availability and opens the existing photo review. Accepting adds a separate cutout and uses it as the piece's main photo throughout Closet Lint; the original stays available on the piece page. This does not write board placement or cutout-outline data. Discarding leaves photos unchanged. After acceptance, board photo caches and visible board/tray rendering refresh. Late availability responses are ignored after the board, selection, or main photo changes. See `tests/board-photo-tools.js` and `tests/photo-review.js`.


### Board recovery review (2026-10-26)

The 0.3 review found and fixed three edge cases. New and Undo New now stop on an unresolved explicit outfit-save failure, just as Edit/Resume already did. Previously, New could move failed work into a detached recovery snapshot that did not retain its in-tab retry target; a lost response followed by resuming and saving could create a duplicate outfit/copy. Retry stays on the same board and record ID. Error feedback explicitly says to keep the tab open. Retry identity still does not survive a reload; no persisted operation schema was added.

Collage piece-deletion Undo now restores the original window count, including intentionally empty windows. It leaves a subsequent window-count change or replacement layout intact. Clearing an outfit name while a save is in flight also remains a newer unsaved edit; the completion callback only normalizes the name if its entered value is unchanged.

Synthetic regression tests reproduce the failure boundaries and cover ordinary saves, Save a copy, uncertain responses, successful retries followed by Undo New, title clearing, collage restoration, and later layout choices. The full JavaScript unit suite passes, including runtime save serialization/retry, preview/checkpoint/reload isolation, navigation, deletion/Undo, and autosave boundaries. Embedded board sources and whitespace checks pass. No new browser/physical-phone check or Python rerun was needed for these editor-only changes; physical phone acceptance remains in progress. No new feature, schema, algorithm version, package, or deployment.


### Calendar to board (2026-10-26)

A future calendar day offers Create an outfit for this day and Choose a saved outfit. Create uses the existing workspace checkpoint/switch boundary to keep the current board before opening a fresh, dated draft. The date and Back to calendar remain visible; Save & schedule stays readable on mobile. Back checkpoints the draft, returns to that day, and schedules nothing. Other drafts can recover the previous work, including its text, layout, and photo crops.

The dated draft carries `calendarPlan` only in the board/workspace envelope, outside saved-outfit metadata. Save & schedule checkpoints a stable outfit ID, then writes the outfit and a stable plan key/date together in one outfit record. A lost response, in-tab retry, or reloaded dated draft uses the same target. This persisted identity applies to calendar planning; ordinary outfit/copy retry identity still lasts only for the open tab. Retry repairs its failed record before asking the global flush to pass. A failed protection checkpoint leaves the original board active. Outfit-write failures, final board-checkpoint failures, or edits made during saving keep the dated board open; the UI distinguishes an unwritten outfit from an outfit saved with recovery still pending. Navigation waits for Save & schedule, and success returns to the selected calendar day after the checkpoint succeeds.

Coverage: `tests/calendar-board.js`, board save/workspace/autosave suites, and route integration. Synthetic Chrome at 320, 390, 760, and 1280 pixels checked recovery, failure/retry, Back without scheduling, retained date after reload, readable save controls, and no page overflow in light Field Notes and dark Workshop. No personal wardrobe was edited. Weather/event details remain available through the existing saved-plan editor; calendar-created outfits initially schedule the selected date only.

### Current presentation and review boundaries · 31 October 2026

Routine Autosaving/Autosaved feedback uses a reserved inline slot; errors and retries remain separately visible. Other drafts sits beside the naming row on desktop and below it on mobile. Selected text and transparent photos retain clear backgrounds. New pieces are initially fitted within both board dimensions, and processed-photo caches distinguish replacement/cropped photos by their full addresses. Remove uses native click activation for pieces and text, including nested icons, without starting a drag.

Straighten has been removed from the toolbar; existing rotation snapping remains. The separate design, arrangement, and removal Undo paths remain. Unified chronological Undo, alternate-photo selection per board, and more consistent off-board movement are deferred. See [testing](../../CONTRIBUTING.md#testing) for focused regression and browser evidence.

## Performance review records

This is a historical engineering review, not an installation guide or a current release checklist. Measurements and pass/fail statements describe the dated review work. See [release planning](../../CONTRIBUTING.md#release-preparation) for current scope and [testing](../../CONTRIBUTING.md#testing) for repeatable checks.

The implementation review and final synthetic checkpoint are complete. Startup routing, saved-outfit rendering, warm thumbnail lookups, board ownership, autosave, save recovery, and conservative CSS cleanup are addressed. This does not certify physical phone performance or resolve the separately deferred network stalls. Historical measurements below are labeled by pass; the final checkpoint summarizes that review.

### Implemented

- Hide page bodies until capability and initial wardrobe snapshots are ready. Show a loading status, and show a refresh instruction if an initial snapshot fails.
- Resolve the requested URL before rendering a remembered/default page. Queue navigation made while loading.
- Avoid a second render immediately after the route renders its initial destination.
- Remove the duplicate saved-outfit redraw on subsequent data updates.
- Retain Sky landing/alias routing in the development source. No algorithm or storage behavior changed, so algorithm versions are unchanged.

The changes are isolated against v0.2.0 in the performance-review worktree and synced into the active development source. Published 0.2 and the stable demo are unchanged.

### Browser evidence

Tests used separate synthetic installations in Chrome, with a deliberate 1.2-second delay on the initial state request. Desktop viewport was 1,704 pixels wide. Phone-width checks used a 390-pixel iframe viewport in desktop Chrome; this is a responsive-layout check, not physical phone or touch emulation. Test instrumentation and framing changes exist only in the output harness, not application sources.

| Check | Observed page transitions |
| --- | --- |
| Published 0.2, direct Oracle | Closet at 576 ms; Oracle at 1,887 ms |
| Corrected release baseline, Oracle | Oracle first, at 1,766 ms; no closet frame |
| Corrected development, 390-pixel Sky | Loading at 710 ms; Sky at 1,976 ms |
| Corrected development, 390-pixel Oracle, large fixture | Loading at 684 ms; Oracle at 1,884 ms |
| Corrected development, desktop Sky, large fixture | Loading at 178 ms; Sky at 1,550 ms |
| Corrected development, large saved-outfit fixture | Loading at 438 ms; saved outfits at 2,023 ms |

These are individual diagnostic observations, including artificial delay, not stable latency budgets. The painted-page probe samples animation frames; it does not measure network transport or total interaction readiness.

The larger fixture contains 1,000 synthetic pieces and 250 four-piece outfits. The saved-outfit renderer ran twice during initial hydration before the final correction (49.5 and 85.8 ms). After correction, it ran once (78.2 ms). A search narrowing to ten outfits still spent 420.2 ms inside the synchronous redraw function. This warrants further profiling; it is a single desktop sample, not a median or phone measurement. No personal wardrobe data was used.

### Disposition at the review checkpoint

- **Completed:** URL-first startup; saved-outfit metadata caching and bounded rendering; warm thumbnail lookup index and restore invalidation; board module/document boundaries; render/autosave separation; explicit save status/retry state; conservative theme CSS cleanup; final synthetic browser and regression checkpoint.
- **Release preparation at the time:** Sky integration, release scope, documentation, extracted-package recovery, and physical phone review were still pending. Version 0.3.0 has since been published; these are historical gates, not the current release checklist.
- **Deferred maintenance:** broader shared application state, cross-selector CSS restructuring, cold thumbnail-worker startup, warmup scanning/cache growth, and other large-list rendering (board-tray batching is completed below). None is being silently folded into the Sky release.
- **Measurement follow-up:** retain the synthetic benchmark and compare repeated runs on the same machine. Current measurements are a baseline, not CI-enforced latency or memory budgets. Full browser-paint timing and retained-heap/leak analysis still need dedicated tooling.
- **Separately deferred:** mobile transport stalls and the outfit-preview/draft-switching redesign.

Existing bounded closet batches, thumbnail/lazy loading, saved-outfit batches, and bounded Lab generation remain. No framework or scoring rewrite was introduced.

### Growth since 0.1

App/runtime source, excluding duplicate embedded modules, grew from 906,578 to 1,098,750 bytes (21.2%). Delivered HTML grew from 830,712 to 998,378 bytes (20.2%). Runtime source grew 32.9%, and tests grew 130.2% by bytes. These are source-size comparisons between published releases, not evidence of a corresponding slowdown.

### Validation

- Full JavaScript unit suites pass in the isolated release-baseline tree and active development tree, including Sky and daily-card suites in development.
- Navigation integration tests cover startup gating, queued navigation, partial snapshots, no-database fallback, visible initial-load errors, initial/subsequent single outfit draws, direct links, guards, and history behavior.
- Embedded navigation synchronization and whitespace checks pass.
- The development Wishlist Pass VM fixture now supplies its existing browser scroll dependency; this is test-fixture support, not a ranking algorithm change.
- Browser checks cover direct Oracle, outfits, board, Sky, and missing-collection recovery, with responsive checks as described above. No new physical phone check was performed, and no server/storage mutation behavior was changed.

Sky is targeted for the next release. Its release integration, performance, behavior notes, algorithm versions, and scope still need a dedicated release checkpoint.


### Follow-up implementation · saved outfits and thumbnail lookup

Completed the next optimization batch in development and the isolated review branch:

- Reused one active-piece map for all rating lookups, preserving exact, legacy role-only, and stored-outfit rating precedence.
- Cached derived outfit metadata against the values of outfits, edits, custom pieces, profile/fit settings, ratings, and photo-load progress. Value checks cover in-place updates and Undo, rather than relying on object identity.
- Mounted saved-outfit cards in batches of 40, with automatic loading near the viewport and an accessible Load more outfits button. Filtering still searches the full library. Search remains immediate, and the search input retains focus.
- Added an in-memory warm-preview index populated by the thumbnail worker. Indexed requests read the preview directly without reading or hashing its original. Restore clears the index and changes its generation, preventing a pre-restore worker from publishing stale entries. Cache corruption, missing previews, cold requests, original fallback, ETags, and same-origin controls remain covered.
- In development, moved the mobile Sky sharing control to a compact Share button in the map’s top-right corner. The desktop header control and existing share dialog remain. No scoring/selection changes or algorithm version bumps were needed.

With the same 1,000-piece, 250-outfit synthetic browser fixture, the initial redraw took 32.2 ms and mounted 40 cards. Five warm searches took 12.7, 13.8, 10.8, 14.8, and 8.8 ms (median 12.7 ms), versus the earlier 420.2 ms sample. These are synchronous redraw measurements in desktop Chrome; subsequent image decode, layout, and painting are outside the measured function. The comparison is diagnostic, not a physical phone benchmark.

A separate 20-run warm cache lookup benchmark used a real, synthetic 2,048 × 2,048 noise PNG (12,598,429 bytes) and its generated 157,294-byte preview. Median read/hash/lookup fell from 9.352 ms to 0.027 ms on the indexed path. This excludes network time and cold generation. It does not resolve the separately deferred mobile transport stalls. Worker process startup and warmup scanning remain further profiling opportunities.

Validation: both complete JavaScript suites passed. In the existing supported photo Python environment, the full Python suites passed (96 baseline-tree tests and 100 development-tree tests); subsequently added legacy indexed-route coverage passed in both focused catalog-photo suites. The system Python run encountered its older unsupported Pillow version; no dependency or safety floor was changed. Focused tests cover cached metadata invalidation, full-library search, bounded card mounting, load-more behavior, rating precedence, zero original reads for warm uploaded/catalog thumbnails, corruption, restore invalidation, and stale-worker rejection. Browser checks confirmed search performance and mobile Share placement and dialog behavior at a 390-pixel iframe viewport. Physical phone behavior still needs verification.

The diagnostic harness and raw measurements were retained as local development artifacts and are not included in this repository. That pass was followed by the board, autosave, save-state, CSS, and final checkpoint work below; it did not publish a release or update the stable demo.


### Board/editor and CSS boundary pass

The board session, editor/pointers, collage, design/export, and base CSS now have focused editable sources with deterministic embedding. Whole-board replacement uses one transition helper, document snapshots detach mutable data, and late gestures are bound to their originating board and pointer. Scoped CSS cleanup preserves final declaration values and media conditions. See [BOARD-EDITOR.md](DEVELOPMENT-RECORDS.md#board-editor-records) for ownership, checks, remaining shared-state coupling, and visual-review limits. No framework, storage format, algorithm, or protected outfit-opening workflow was changed.


### Board paint/autosave separation (2026-10-25)

Removed draft autosave and document normalization from board rendering. Added explicit commits at every audited mutation and Undo boundary, including New/Open, Lab handoff, closet removal, design/layout, arrangement, text, and pointer completion. Pointer selection no longer writes; cancelled/lost-capture motion retains its final position, while cancelled cutouts do not apply. Existing runtime debounce, serialized storage, retry, and backup-flush behavior is retained.

Added synthetic action-level persistence coverage that cannot rely on render side effects. Updated navigation/workspace fixtures to reflect the same boundary. See `BOARD-EDITOR.md` for the mutation audit and remaining shared-state/save-state review. No scoring algorithm, schema, framework, published package, or demo change.

Validation for this pass: both full JavaScript suites passed, and the supported Python suites passed (97 baseline-tree tests and 101 development-tree tests). Embedded-source checks and `git diff --check` passed.


### Shared save status and recovery (2026-10-25)

Added persistent draft/outfit status and manual retries, explicit outfit-operation state, stable retry IDs (including copies), and per-board failure recovery through New/Undo. Retries snapshot the latest edits; older acknowledgements cannot mark newer draft edits saved. Runtime record failures clear only when that same record succeeds. Existing automatic retry/flush/unload protections remain. See `BOARD-EDITOR.md` for the state contract, tests, and open-tab limitation. Both complete JS suites and supported Python suites pass (97 baseline, 101 development). No new interactive visual check, schema, algorithm, or published demo/package change.


### Theme CSS cleanup (2026-10-25)

Removed 69 superseded declarations from the shared theme stylesheet, removed empty rules, and joined adjacent mobile browse-control blocks. Each removed declaration has a later replacement with the exact same selector, media conditions, property, and importance. Retained rule order, specificity, theme variables, breakpoint conditions, and modern-value fallbacks. This covers header sizing, card controls, category tabs, collection previews, photo tools, and mobile text-only controls without redesigning them. Both development and review sources use the same cleaned stylesheet; embedded HTML is synchronized.

This is maintenance cleanup, not a claimed rendering-speed improvement. Keep skin and appearance independent, preserve coarse-pointer tablet breakpoints, and avoid moving responsive or text-only overrides ahead of their base rules. Further cross-selector consolidation needs visual comparison, rather than assuming that similar declarations are interchangeable.

Validation: final declaration maps match the pre-cleanup sources for every selector and media context. Both complete JavaScript suites passed, including theme, mobile UI, board, and control-mode checks. No new interactive browser or physical phone visual check was performed; existing tests do not establish pixel equivalence. No algorithm, storage, package, or demo change.


### Final checkpoint (2026-10-25)

Used a separate synthetic development installation with 1,000 pieces, 250 saved outfits, and 1,000 valid unique core-outfit ratings. Five repeated navigation/search cycles measured synchronous function/handler time inside the page, rather than browser-control round-trip time. The initial fixture mistakenly included footwear in core rating IDs; it was corrected before the retained results.

| Measured work | Samples | Median | Maximum |
| --- | ---: | ---: | ---: |
| Closet grid render | 15 | 16.1 ms | 32.1 ms |
| Saved-outfit redraw/search | 20 | 15.5 ms | 23.5 ms |
| Lab rendering | 10 | 14.3 ms | 27.9 ms |
| My Taste presentation | 9 | 2 ms | 3.1 ms |
| Sky navigation handler | 5 | 33.4 ms | 407.8 ms |

The first Sky visit cost about 408 ms; later visits were much faster. Keep cold Sky work as a profiling follow-up, without changing scoring in this release. Saved-outfit cards stayed at or below 40. After all screens were initialized, equivalent end-of-cycle DOM counts stayed between 6,405 and 6,422 nodes. Approximate browser heap samples rose and fell (including a fall from about 160 MB to 97 MB), which does not establish a memory leak or prove leak freedom. No forced-GC retained-heap analysis was performed. The two-frame settlement probe frequently hit its timeout and is **not** accepted as a paint-latency benchmark.

Direct Sky startup showed loading followed by Sky without a closet frame; board reload likewise opened the board directly. Responsive checks covered all three skins, both light/dark appearances, and icon/text controls at phone width. A controlled draft/outfit failure retained the latest name; explicit retries saved it, and reload restored the same saved outfit. New outfit confirmation and immediate Undo restored the board and saved association.

The visual pass found two mobile sizing issues: retry labels inherited icon-only toolbar widths, and Fantasy mode’s text-only width was overridden by a later icon rule. Both are corrected without changing theme colors or breakpoints. Browser viewport checks are not physical phone touch verification.

The complete development JavaScript suite and all 101 supported Python tests passed. After the CSS fixes, focused save-state, theme, mobile UI, control-emoji, and embedded-source checks passed. Additional browser probes and failure-injection fixtures were local review artifacts, not shipped sources. No personal wardrobe was changed. Published 0.2 and the stable demo remain unchanged.


### Board picker and large-list audit (2026-10-26)

Board thumbnails now mount in batches of 60, with automatic loading when the end comes into view and a keyboard-accessible Load more pieces fallback. Category, favorite, Sky, and text filters still search the full owned-piece list in the same order. Filtering resets the mounted batch and mobile picker scroll. Replaced/disconnected grids reject late observer callbacks. This bounds initial DOM creation; it is progressive loading, not virtualization, so scrolling through every piece can still mount the entire result.

Validation: full JavaScript suite passes, including a 1,000-piece synthetic tray fixture for complete filtering, manual fallback, correct card actions, and stale observer rejection. Synthetic Chrome checked phone-width automatic loading (60 to 120), search for a piece outside the initial batch, filter reset, and initial desktop batching. No personal wardrobe changed; physical phone acceptance remains pending.

Further large-list review candidates, not changed by this pass:

- Wishlist ranking mounts all matching rows and calculates per-piece analysis. Preserve global ranks, tier dividers, jump links, and drag-to-reorder when improving it.
- Sky detail contributor lists are now deferred and batched; see the follow-up below.
- Collection overview and collection chooser mount every collection (up to four preview images each). The collection piece editor already limits its picker to 80 per step; collection browsing uses the bounded closet grid.
- Trips overview mounts all saved plans, including past trips. These cards are relatively light; archive/group paging may be useful for a long history.

The main closet and saved-outfit cards already have bounded initial batches. No new ranking algorithm or storage format changed.


### Sky contributor lists and page/dialog follow-up (2026-10-26)

Sky detail panels now build only the three preview cards initially. Expanding See all pieces builds 24 more cards at a time; scrolling loads another batch, with Load more pieces as the keyboard/manual fallback. Collapse pauses loading, reopening preserves the mounted cards, and closing/replacing details invalidates old callbacks. Previously mounted cards remain; this is progressive rendering, not virtualization. Scoring inputs, formula version 2.0.0, and contributor order remain unchanged.

The bounded visual review covered Sky detail, board tools, saved-outfit list/preview, collection actions/editor, Sizes & fit, Getting started, and the Trips overview. Synthetic Chrome used 390/502-pixel iframe phone layouts and a laptop viewport. Mobile Sky expanded from 3 to 27 to 51 cards with no panel overflow; long synthetic piece names wrap. Collection actions remain on one line at 502 pixels. Setup Close, collection actions, and outfit-preview actions have at least 44-pixel targets. The outfit preview return link now precedes the title instead of sitting below the image. These checks do not establish exhaustive theme equivalence or physical phone gestures.

Board selected-piece tools now link to the existing background-removal review for both freehand pieces and collage windows. Accepting makes the separate cutout the main piece photo globally; originals remain in the piece gallery. Preview/discard does not save a photo or board, unavailable local tools report setup guidance, and stale selection/capability callbacks cannot open the wrong piece. The synthetic browser verified the unavailable-service path; successful processing/acceptance and original retention are exercised by the `photo-review` and `board-photo-tools` regression tests.

Sky detail text links, piece cards, buttons, and disclosures now include theme-aware hover/pressed feedback and visible keyboard focus. Browser checks verified actual mouse hover for links/cards, keyboard focus, and dark-theme accent feedback. New custom interactive controls must include these states; the rule is documented in THEMES.md.

## Security review records

Contributor reference. The dated checkpoints below are historical; their pending gates describe those builds, not the status of every later release. See [testing](../../CONTRIBUTING.md#testing) and the [published release notes](../RELEASE-NOTES.md) for context.

### Historical browser-import review · 0.2

**Status at this checkpoint: release blocker open.** The earlier 0.1 review below does not cover the new browser ZIP importer. Functional tests and the existing archive checks are preliminary evidence, not security sign-off for this feature.

The prerelease checklist for 0.2 was:

- Review the final ZIP parser and the JSON/photo handoff as untrusted input: central and local header consistency, offsets, overlapping entries, malformed/truncated data, CRCs, duplicate names, ambiguous references, unsafe paths, links, encryption, and unsupported archive variants.
- Exercise compression bombs and false size headers; verify compressed, expanded, entry-count, per-photo, JSON, CPU, and memory bounds, including cancellation and browser responsiveness.
- Review image signatures versus actual decoding, supported formats, browser isolation, and malformed image behavior. Confirm imported text cannot introduce executable HTML or scripts.
- Verify ZIP-local URLs are trusted only within their import session, never leak into saved records, and are revoked on success, errors, replacement, cancellation, and stale async reads.
- Verify no wardrobe writes happen before review, failed/retried saves preserve correct photos and matches, and archive input cannot target existing files or change the full backup restore flow.
- Test the final browser implementation, including supported mobile/browser behavior and unavailable decompression fallback. Record findings, fixes, focused adversarial tests, residual limits, and the exact reviewed commit.
- Tie the completed review to the fresh release candidate and package hash. Later ZIP-related code changes require rechecking the affected areas before publication.

Do not close this gate solely because the normal import suite passes. Record the review's actual scope and reviewer type; do not describe an AI-assisted review as an independent human audit.

### 24 October review checkpoint

AI-assisted source review and adversarial tests identified and fixed missing overlap rejection and missing active cancellation/total elapsed-time bounds in browser ZIP loading. The parser now checks local sizes/CRCs against the directory, validates streaming data descriptors, rejects overlapping local-entry ranges and unsupported file types/flags, bounds expansion, and applies a 30-second elapsed-time budget across awaited reads. Closing the import or replacing its file aborts the active load. Already-created session photo URLs are revoked on cancellation and errors. PNG detection now checks the complete eight-byte signature.

Automated adversarial cases cover stored/Deflate archives, CRC failures, header disagreement, overlapping entries, descriptor success/failure, unsafe and ambiguous names, unsupported types, symlinks, encryption, declared size limits, false expansion sizes, missing native decompression, early/in-progress cancellation, elapsed-time limits, and URL cleanup. Existing import flow tests cover no writes before review, photo save/retry behavior, and exclusion of ephemeral URLs from saved records.

These are bounded browser operations, not an operating system memory sandbox. The input is limited to 50 MB and declared expansion to 100 MB; buffers, Blob storage, and decoder allocations add overhead. Browser image decoding happens in the browser's own isolation; malformed images must still pass the existing rasterizer before save. This review does not establish a hard memory ceiling or comprehensive browser-engine exploit protection.

**Gate still open at that checkpoint:** final extracted-package browser verification, exact reviewed commit, candidate hash, and final CI/advisory/secret checks must be attached before publication. This checkpoint is not an independent human audit.

---

## Security review for 0.1

This is an AI-assisted code review with automated adversarial tests, not an independent human audit, penetration test, or guarantee of security. The initial review and subsequent fixes cover the candidate prepared for 0.1. Current check results and platform limits are in [TESTING.md](../../CONTRIBUTING.md#testing).

### Scope and trust boundaries

Reviewed the Python HTTP/storage service, backup and restore, assistant importer, optional photo worker, browser storage adapter, HTML/DOM insertion, product links, image ingestion, source packaging, and dependencies.

The local service is for one personal wardrobe on your computer, optionally accessible over a home network you trust. There are no accounts: anyone who can reach it can view and edit that wardrobe. Host, origin, and request-token checks defend against cross-site browser requests; they do not authenticate users. Do not expose the service directly to the internet.

The assistant importer reads prepared metadata and image files from an authorized local folder. It does not fetch product URLs, connect to email, execute imported text, or send data to an AI provider. The optional photo worker uses a locally configured interpreter and an argument array, not a shell command. Its configuration is trusted machine setup, not an imported wardrobe setting.

Public static demos are separate exports. They copy selected fields and photos into a snapshot; visitor edits stay in browser storage. The export flow supports a collection/photo review and re-encodes selected photos without source metadata. Publishing a snapshot is a separate privacy and image-rights decision. The editable local sample server is not a public demo server.

### Protections and tested fixes

| Area | Protection |
| --- | --- |
| Imported text and links | Text nodes for titles/descriptions; http(s)-only links without embedded credentials; external links use `noopener noreferrer`. Board SVG frame colors accept supported hex values, closing the reviewed attribute-injection path. |
| Script policy | The local server hashes its exact inline script blocks, including per-instance bootstrap data. Arbitrary inline handlers and eval are not allowed. Inline styles remain permitted for the current interface. |
| JSON and schema validation | Reject unsafe/duplicate keys, non-finite values, excessive nesting/complexity, unsupported versions, malformed common piece fields, invalid board pieces, and malformed photo lists before writes. |
| Backup and restore | Reject escaping paths and ZIP symlinks; bound archive sizes; check references, CRCs, and supported image headers. Preview does not replace data; confirmed restore uses a transaction and retains a recovery snapshot. |
| Resource bounds | Restore uploads stream in chunks. Preview count and lifetime, request size, socket idle time, and concurrent server workers are bounded. Photo processing is serialized with an output-size check and timeout. |
| Photos | Browser uploads restrict formats and rasterize/cap images. Assistant imports re-encode images and remove EXIF/GPS metadata. SVG uploads are rejected. Restored/direct API assets retain their bytes and may retain metadata. |
| Optional worker | Uses direct U²-Net inference through ONNX Runtime, with Pillow 13 or newer. Setup and inference verify the model checksum; original photo pixels are retained behind a new transparency mask. |
| Repository and dependencies | Allowlisted source packaging, empty embedded wardrobe, separate sample data, pinned Actions, locked npm dependencies, advisory checks, and full-history secret scanning. |

Tests cover hostile SVG colors and URLs, poisoned keys, malformed fields/archives, unsupported backup versions, oversized image headers, preview cancellation/expiry, malformed restore confirmations, HTTP length ambiguity, CSP hashes, origin/Host/token rejection, import retries, rollback, and preservation of existing records.

### Verification

The candidate passed GitHub Actions for the JavaScript and Python suites, npm and optional Python dependency advisory checks, public-source boundaries, and full-history Gitleaks scanning. No known advisories or matching secrets were reported by those checks at that checkpoint; scanners cannot prove their absence. The separate Python 3.10 core-runtime check also passed.

A fresh extracted sample ran as a listening local server. Its browser backup/restore rehearsal preserved photos, saved outfits, and the working board, and verified the pre-restore recovery copy. Static sample pages and photos were also exercised on SiteGround. These checks do not amount to a penetration test, independent hosting-header audit, or comprehensive browser-security review.

### Remaining limits

- There is no authentication, built-in TLS, multi-user isolation, or protection from a trusted LAN client intentionally editing data or filling the disk. Use one editing device at a time.
- Databases, browser storage, and backups are not encrypted by the app. They rely on device security and operating system permissions. Full backups can contain private measurements, wear history, and photos.
- Image header validation is not a full decoder or malware scanner. Worker timeouts and thread limits do not impose an operating system memory limit on Pillow or ONNX Runtime. Disk quotas, total wardrobe growth, and hostile-client resource exhaustion are not comprehensively sandboxed.
- Normal ingestion and public photo exports re-encode images; restored assets and direct API uploads may retain metadata. Background removal is not anonymization.
- Schema validation covers common fields and unsafe shapes, not a complete formal schema for every profile, trip, or outfit setting. More fuzzing and independent review would provide additional evidence.
- Model weights and optional dependencies are downloaded at setup. Fonts are requested from Google Fonts; the app is not described as making zero external requests. See [THIRD-PARTY.md](../THIRD-PARTY.md).
- Windows/macOS installation, final physical-mobile workflows, and broad assistive-technology testing are not established by the automated suite. See [TESTING.md](../../CONTRIBUTING.md#testing) for the remaining release checks.

Code and Linty artwork are GPL-3.0-or-later; third-party components retain their own terms. GitHub private vulnerability reporting is enabled. Report security issues privately using [SECURITY.md](../../SECURITY.md).

### References

- [OWASP secure code review](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html)
- [OWASP file upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

25 October 0.2 release follow-up: website terms, permission, and responsibility guidance was added to three browser-assistance descriptions. Removing those three copy additions reproduces the security-reviewed setup module exactly; ZIP parsing and import behavior are unchanged.

### 0.3 candidate scope

Sky and daily readings run locally. Sky sharing renders a chart image without garment photos, purchase details, or the local server address. Daily readings use bundled text and local wardrobe inputs. The previous ZIP-import review remains historical evidence, not a new independent audit of 0.3. The release allowlist and embedded-data/credential-pattern scan pass at source preparation; dependency checks and extracted-candidate validation must be recorded separately before publishing. No independent human security audit is claimed.


Direct import setup (0.3): installation paths and batch status are read only through the local runtime's existing token/Host/Origin boundary. They are not embedded into public-demo HTML or the browser file request. Copied assistant instructions omit the browser token. Setup checks write only profile evidence; previews do not create saved receipts. Generated imports carry the expected wardrobe identity, checked inside the import transaction before receipt lookup or mutations. Saved results require a committed receipt for the exact batch. No new remote import mutation endpoint or assistant account connection was introduced. Reusable setup markers contain local paths in full private backups and are invalidated by changed app/data locations. Existing public-demo generation allowlists its profile content.

## Accessibility records

The confirmed findings from the first review have been fixed in development. Mobile target sizes and the sticky form footer remain unchanged, as requested. The owner considers this bounded pass complete for 0.4; a fuller accessibility review is deferred. This is not a claim of complete WCAG conformance.

### Fixed

- **Freehand board keyboard access:** Tab selects a piece; arrow keys move it, plus/minus resize it, and square brackets rotate it. Shift makes larger adjustments. Delete removes a selected piece, and Undo restores it. Keyboard instructions are available to screen readers.
- **Remove button activation:** keyboard and pointer activation both work. Tab reaches the selected piece’s Remove button, including after reloading the board.
- **Menu focus:** Escape closes the hamburger menu and returns focus to its button.
- **Text contrast:** filter headings/counts, Lab adjustment text, Sky secondary text, the empty photo preview, and measurement-unit dropdown now have clearer colors. Sizes and spacing are unchanged.
- **City search:** a normal labeled input and native result buttons replace invalid textbox ARIA. Results support arrow keys, Home/End, Escape, and Enter. Selection saves, preserves focus, and survives reload.
- **Labels and structure:** visible names and accessible names agree, including counts, fortune cards, Lab pieces, Trip days, and board actions. Page notices and menu content have landmarks. Filter and tray heading levels were corrected without changing their appearance.

Visible impact: stronger text contrast and keyboard focus states that reuse the existing hover palette, with an outline as a clear locator. A Skip to content link appears only when tabbing. Reduced-motion and system high-contrast preferences have shared support. No new toolbar, larger buttons, or changed mobile target dimensions.

### Mobile target-size review · left unchanged

The scanner reported 10 repeated occurrences involving three color-chip selectors in Add piece at phone width. The inspected Soft Hardware chip is **40 CSS pixels tall**, not 15px. The roughly 15px figure was the exposed clickable portion when a row sat partly under the sticky Cancel/Add footer.

Scrolling the form revealed the full 40px chip and made its center clickable. The finding concerns that scroll position/overlap, rather than a generally tiny button. No chip sizes, spacing, or footer layout were changed. These specific flags remain recorded for review; new target-size findings elsewhere still fail the regression check.

### Verification

- A complete 276-scan matrix covered 23 page/dialog states, all three themes, light/dark appearances, and 390/1366px viewports. It was followed by a 12-scan board recheck after final activation/label changes.
- Only the deferred mobile scroll edge target-size flags remain in the resulting automated findings. Contrast, label matching, city-field markup, heading order, and landmark findings are resolved in the tested states.
- All 31 keyboard/reflow checks passed: menu and calendar focus return, board selection/movement/resize/rotation and reload persistence, Remove activation, city-result keyboard use and persistence, and document reflow on Closet, Outfits, Settings, and Trips at 320, 390, and 1366px.
- The complete JavaScript unit suite passed. Tests used disposable sample data. The protected deployed wardrobe was not edited or deployed in this pass.

### Ongoing checks and remaining review

`npm run test:a11y` runs the browser matrix and interaction checks in CI. Resolved findings have been removed from `tests/accessibility-baseline.js`, and the keyboard checks no longer allow the previous failures. New findings, worsening measured contrast, scan errors, or failing interactions block the regression check. The baseline retains only the reviewed mobile scroll edge flags.

`npm run test:a11y:strict` reports any automated finding as a failure, including deferred flags. `npm run test:a11y:report` writes full results to the system temporary folder; `A11Y_OUTPUT` can select another path for an individual run.

Still needed: an actual screen reader walkthrough, meaningful image-description review, focus visibility/obscuring throughout, actual 200% text enlargement, real-OS confirmation of forced colors/reduced motion, and non-drag pointer alternatives. Collage/text editing, deeper wizard and photo tool states, and every failure/recovery path are not exhaustively covered. The hosted password challenge was not audited. These remain follow-up work rather than additional 0.4 acceptance gates; passing automation alone does not establish accessibility.

See [testing notes](../../CONTRIBUTING.md#testing). References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [axe-core API documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md).

### Focus and preference follow-up

Hover and keyboard focus now share the existing colors on the main controls, tabs, navigation, menus, and disclosures. Outlines locate keyboard focus without being permanently drawn around every element. Non-interactive main content receives programmatic skip-link focus without a large box around the whole page. Theme-specific outlines and colors remain in use; system high-contrast mode uses system colors.

All 162 browser checks passed across three themes, light/dark appearances, and 390/768/1366px widths: first-Tab skip navigation, correct content focus and unchanged routes, hover/focus color parity, representative focused-button text contrast, CSS reduced-motion behavior, and high-contrast focus/selected indicators. These checks are part of `npm run test:a11y`. Focus-state regression scans of the affected pages also passed. This supplements, rather than replaces, actual assistive-technology review.

The local comparison sheet uses native screenshots of actual app components. Its “before” images recreate the recorded pre-fix colors on the current layout; they are not screenshots of an older deployed build.

Remaining Trello tracking:
- [Manual acceptance and deeper state review](https://trello.com/c/JlvOXsQJ)
- [Collage/text controls and alternatives to dragging](https://trello.com/c/N1aAh0xU)
- [Mobile scroll edge review, with target sizes unchanged](https://trello.com/c/zAVHA49v)

## Wishlist analysis reference

Your wishlist order comes from your own choices. The supporting information helps you compare potential partners, similar pieces, favorites, and recorded wear; it does not decide what you should buy.

Missing tags or wear logs limit the evidence, rather than counting against a piece. A possible overlap is a reason to compare items, not proof they are duplicates. Open a piece to check its details, and treat a Saved note as older AI assistant advice rather than a live calculation.

### Contributor reference

The sections below describe the calculation and its verification.


Analysis version `2.1.1` (`WISHLIST_ANALYSIS_VERSION`) keeps color, aesthetic, and occasion observations independent. Version 2.0.0 introduced narrower similarity and versioned evidence; 2.1.0 removes its shared-style gate and repetitive missing-details badges. Version 2.1.1 corrects the layer pool for normalized cardigans and recorded layers, and prevents a multicolor palette with a neutral accent from counting as wholly neutral. It never changes ranking scores, pair selection, ordering, section thresholds, prices, or saved assistant notes.

### Potential partners

The active closet excludes wishlist, hidden, stored, donation, and removed pieces. Tops are compared with bottoms; bottoms and outerwear with tops; one-pieces with outerwear and recorded layers (including cardigans stored under Tops and tops marked for either role); other categories with core clothing. Color compatibility uses known neutrals, shared colors, or broad color families. Explicit known colors can still support a match when multicolor is also recorded; the unspecified palette cannot establish neutrality or similarity. Aesthetic and occasion counts independently report shared tags. Occasion tags such as casual/dressy are supporting context, not evidence of a complete outfit. Different tags do not mean missing details; missing fields only limit their own observation. No repeated “needs more details” badge or generic zero-match verdict is shown. These are descriptive observations, not outfit guarantees.

### Possible overlap

Owned and active wishlist candidates must share an explicit category and subcategory, the same nonempty normalized recorded color palette, and at least one descriptive tag in pattern, material, details, neckline, length, sleeve, or shape. Color aliases and tag casing normalize. Unknown values, multicolor placeholders, and generic plain/solid/regular/basic tags cannot establish similarity. Occasion, aesthetic, or season alone cannot establish overlap. These are pieces to compare, not duplicate determinations. Broad category counts no longer imply a gap or excess.

### Lab and wear context

Owned favorites add context among color-compatible candidates. Personal context excludes known season and casual/dressy conflicts, but never requires identical aesthetic or occasion tags. The Lab's validated, latest-per-combination rating entries identify color candidates appearing in outfits rated Like or Love. This does not rate the wishlist piece, assign the outfit's rating to individual pieces, or infer disliked features. A newer negative rating replaces an older positive rating for the same combination.

Repeat wear context counts partners with at least three distinct valid logged dates in the past 365 days, excluding future dates. Missing or sparse logs do not count against a piece. The UI does not claim that individual wear dates establish co-worn outfits.

Saved assistant prose is retained verbatim with a “Saved note” prefix. It is separate from live evidence and may be older.

`tests/wishlist-analysis.js` checks missing data, strict overlap, latest Lab evidence, wear dates, inactive-piece exclusions, and unchanged ranking/state.

Head-to-head refreshes current piece records and live evidence after wardrobe updates while retaining valid comparison IDs. Opening details with the keyboard does not submit a preference. `tests/wishlist-photos.js` covers these interaction regressions.

## Release planning records

The [0.3.0 release](https://github.com/stephthegeek/closetlint/releases/tag/v0.3.0) preserves its historical notes. See the [current release notes](../RELEASE-NOTES.md) and contributor release verification for 0.4.0.

### Current 0.4 scope · 31 October 2026

Feature work is frozen for release preparation. Resolve reported defects, reconcile documentation, and verify the final candidate. Source changes, private installations, and demos do not by themselves establish a published release.

Implemented in the current source:

- **Trips and events:** unfinished trip saving, daily outfit planning and pinned choices, packing quantities, reminders, and print/PDF/Markdown exports with optional photos and outfit combinations.
- **Categories and pieces:** expanded searchable categories and setup choices, populated category visibility, pullover/cardigan/vest types and layering defaults, Eyewear with Glasses/Sunglasses subcategories, optional fabric weight, approximate acquisition dates, and recent wear indicators. The strip shows ten days; heat thresholds are three/eight logged days in thirty days.
- **Metal & finish:** optional grouped material, metal tone, and finish tags for jewelry, watches, and bags. The universal color palette is unchanged.
- **Imports, photos, and Oracle:** batch import and Tidy photos pages with review recovery, photo only preparation for existing pieces, scoped Oracle context/photos, explicit local/SSH/download workflows, and remembered route choices. Direct access still requires a configured, approved connection in the AI assistant session; the app does not establish SSH access.
- **Controls and reliability:** representative calendar thumbnails and clearer day details, card menus, category first browsing, predictable collection clearing, board photo refresh/removal/initial sizing fixes, steadier save feedback, and a maximum of three outfit columns. Stale tab protection and atomic outfit wear logging remain in place.
- **Bounded accessibility improvements:** keyboard controls, focus visibility, contrast, labels, reduced motion, and regression checks. The [accessibility review](../../CONTRIBUTING.md#accessibility) records the limits; mobile targets remain unchanged by request.

Trello holds working task status. This document records scope and release gates; it is not automatically synchronized with Trello.

### Review status and remaining acceptance

Owner review has produced substantial Trips, outfit, board, category, photo, and mobile feedback. The hosted photo only workflow has been exercised, and the category cleanup is complete. Tablet and narrow mobile browser reviews are recorded in [testing](../../CONTRIBUTING.md#testing). These facts do not imply final approval of an unpublished package.

Keep the remaining owner pass focused on the final candidate: verify recent fixes on the intended installation, especially photo inclusive PDF export, photo preparation, board edits and recovery, and phone saving/sharing. There is no blanket requirement to repeat the old feature-by-feature review queue. Physical phone keyboard/gesture behavior and native sharing remain separate from emulated browser checks.

### Trip defaults retained for 0.4

Automatic underwear, bra, sock, and sleepwear groups use owned catalog presence. Underwear types share one quantity; generic loungewear does not imply sleepwear. Explicit choices remain recoverable, and activity requests can still show reminders for uncataloged swimming/exercise needs. Stored and filtered pieces use catalog scoped reminders. Suggestions are starting points, not evidence of everything a person owns or guarantees of comfort, dress code, weather protection, or laundry timing. See [Trips](../USING-CLOSET-LINT.md#trips-and-packing) for user guidance.

### Deferred work

- Unified chronological board Undo, alternate piece photos per board, board edge movement and toolbar investigations, and a shared Closet/Outfits long list review.
- Cold wear status, expanded wishlist ranking/decision evidence, and broader fashion/resale integrations.
- Deeper [accessibility acceptance](https://trello.com/c/JlvOXsQJ), [non-drag alternatives](https://trello.com/c/N1aAh0xU), and [mobile scroll edge review](https://trello.com/c/zAVHA49v). The owner considers the bounded 0.4 accessibility pass complete; these are follow-ups rather than new release gates.
- General hosted assistant connection setup and broader hosting provider support. Hosting remains experimental.

Almanac remains after 0.4. Its presence in the development working tree does not authorize release inclusion. Separate that preview and review its related Profile changes before freezing the 0.4 candidate. Other backlog items are not promises for a particular release.

### Before publication

1. Separate the Almanac preview from the 0.4 candidate, including a review of related Profile/menu changes. Freeze the exact source candidate and review its final diff, including the latest fixes. Align the user guides and release notes with that package.
2. Run the complete current regression, supported Python, accessibility, dependency, and security checks. Record the exact candidate and any limits; previous checkpoints do not replace this final run.
3. Build and inspect a data-free package and manifest. Confirm fresh installation/import, supported update behavior, and full backup/restore. Hosted candidates also need isolated update/rollback and access protection checks.
4. Confirm the focused owner/physical-phone pass and resolve any blocking defects. Windows/macOS installation and comprehensive accessibility conformance remain unverified unless tested.
5. Review CI and approve publication. Demo updates are separate actions; app updates remain manual unless explicitly authorized for a particular installation.

[Board guide](https://trello.com/c/HCtQ2ZVE) · [Release record](https://trello.com/c/n1dRmgpz) · [Next shortlist](https://trello.com/c/UW6aznwV)

### Historical 0.3 preparation notes

The archived checkpoints below describe development and review before publication. Their pending tasks, test counts, proposed announcements, and deployment instructions are historical; they are not the current work queue. Later checkpoints may supersede earlier behavior. The published release record above takes precedence, while untested platforms and other stated verification limits remain limits.

#### Ready

- URL-first startup, saved-outfit search/rendering, warm thumbnail indexing, board module boundaries, autosave separation, and save-state recovery are implemented in development.
- Conservative CSS cleanup and the final theme/mobile checkpoint are complete. Retry-label clipping and the text-only Fantasy mode width conflict found during QA are fixed.
- Full development JavaScript suite and 101 supported Python tests pass. Focused checks after the CSS fixes pass. Sky embedded sources are synchronized; scoring formula remains 2.0.0 because this review did not change scoring.
- The source-package preflight enumerates 181 allowlisted files, includes Sky code/content/share artwork, and reports no embedded wardrobe or scanned credential/path findings. This is not a new dependency audit, full-history secret scan, or extracted-package check.
- Synthetic mobile Sky Share opens its preview; desktop Sky has no horizontal page overflow in the checked viewport. See PERFORMANCE-REVIEW.md for measurement and visual limits.

#### Before a release candidate

1. Scope confirmed: 0.3.0 includes Sky and the daily fortune. Saved-outfit preview and draft recovery are now implemented in development. Keep the mobile transport investigation and deeper state/CSS/cache work separate.
2. Integrate the requested development changes into a clean release branch based on published 0.2, preserving unrelated development work. Review the final diff rather than packaging the dirty development branch as an approved release.
3. Update release notes, README development wording, installation/update guidance, and testing/security records for the chosen scope. Describe Sky's Sun/Moon/Rising inputs, sparse-data fallbacks, exclusions, formula version, and local image sharing. Document the open-tab limit on save retries and the known mobile transport issue accurately.
4. Rebuild an unpublished candidate; verify its manifest and included source/assets. Test a fresh extracted synthetic installation, update from 0.2 with backup/restore, and the Sky share export. Repeat dependency, secret, and security checks against that exact candidate.
5. Continue physical phone review already underway and resolve any blockers. Windows/macOS installation and broader accessibility verification remain separate limits unless tested.
6. Prepare the release announcement and stable-demo update for approval. Use `stephthegeek` in demo credits/text during that update. Publishing remains a separate step.

#### Draft announcement direction

**Your wardrobe has a Sky.** Explore the styles you own, want, and wear through your style constellations, and save a shareable image of your three signs. This release also improves startup, outfit browsing, and board save recovery.

**A little guidance from Linty, too.** Reveal a daily fortune or wardrobe nudge. Keep it, dismiss it for the day, or switch it off.

#### First candidate checkpoint

0.3.0-rc.1 is built, unpublished, and extracted. Its 182 manifest hashes and exact membership pass, as do the full JavaScript suite and 101 Python tests. A synthetic 0.2 data-folder update and 0.3 backup/restore retained state and photo bytes. npm’s lockfile audit reports zero vulnerabilities. Exact-package evidence was recorded with that candidate; local sidecar reports are not included in this repository. Final integration/security review, optional Python advisory checks, extracted browser/share-export acceptance, physical phone verification, and the production rebuild remain before publication.

#### QoL review batch

Implemented in development: stable Random closet sort with Shuffle again, full-card trip links with separate Delete, Train/bus wording, and consolidation of similar palette suggestions without rewriting chosen colors. Visual review is pending. Emoji curation remains deferred. The next larger UX priorities are saved-outfit preview/draft recovery and page/dialog consistency. Earlier saving in Trips and packing-list export remain separate backlog work.

#### Saved outfit and collection batch

Implemented in development: saved-outfit preview pages, detached image export, checkpointed switching with persistent recovery through Other drafts, and collection-card links/action cleanup. Full JS and 102 Python tests pass; bounded synthetic Chrome checks confirm preview/edit/reload/return and the 502-pixel collection action row. Physical phone acceptance remained pending at this checkpoint. The remaining larger UX priority is page/dialog consistency; emoji review remains deferred. No new package or deployment.

#### Optional setup and Sizes & fit

Implemented Getting started with optional closet identity, units/emoji preferences, piece/import/restore choices, and read-only photo configuration status. Closet name and built-in-logo visibility persist in profile data; no custom logo upload. Sizes & fit has optional chest/bust, inseam, height, neck, and sleeve measurements plus a single unit selector with in-place input conversion. No body-measurement requirement was added to onboarding, and size matching/algorithms are unchanged. Full JS suite passes, including failed identity saves, defaults, measurement conversion, validation, and history preservation. Synthetic Chrome verified the three setup sections, shared identity save, optional photo status, and converting entered values. Physical phone acceptance remains pending.

#### Board picker performance follow-up

Implemented 60-piece progressive thumbnail batches with automatic scroll loading and a manual fallback; full-closet filters/search and existing item order remain intact. Full JS regression and synthetic desktop/phone-width checks pass. Large-list follow-ups are wishlist ranking, Sky detail piece lists, collection overviews/choosers, and long trip histories; see PERFORMANCE-REVIEW.md. Physical phone acceptance remains pending.

The board header now uses one concise status beside Other drafts, below the name/save row. Duplicate draft/context instructions and the persistent previous-work button are removed; save failures and Retry stay visible. Mobile and desktop layout checks and save/recovery regressions pass.

#### Sky list and bounded page/dialog review

Sky contributor cards now load on expansion and in batches of 24. The bounded review of recent screens corrected small mobile touch targets, moved the outfit-preview return link above the title, and checked heading/Close spacing and wrapping. Board piece tools now open background-removal review; accepted cutouts become the piece's main photo everywhere with originals retained. Full JS regression passes; synthetic desktop/phone-width checks cover representative recent screens. A physical device pass and broader theme/accessibility coverage remain release acceptance work.

The same pass adds visible Sky link/card hover, pressed, and keyboard-focus states, plus draft-menu interaction feedback. Theme guidelines now require these states for new custom interactive controls.

Filter Type chips now show every available category without a More/Fewer types toggle. Sky reading/layout tabs also have hover, pressed, and keyboard-focus feedback while keeping the selected fill distinct. Focused theme/mobile/Sky checks and synthetic browser verification pass.

#### Piece collections and compact photo options

Piece actions include 📚 Add to collection and the shorter Delete label. The chooser offers New collection with the current piece preselected; adding/creating preserves the open piece form and its unsaved values. Existing membership shows Already added. The bulk-add chooser also seeds new collections with the selected IDs. Photo swatches now sit inside collapsed Photo options, including without the optional local photo service; photo refreshes preserve the disclosure's open state. Desktop actions fit two rows at the checked 372-pixel form width; mobile controls retain accessible labels and 44-pixel targets. Full JS regressions and synthetic desktop/390-pixel checks pass, including failed-save retry and unsaved-form preservation.

#### Laundry and care

Implemented in development from the reviewed v2 wireframes, adapted to the current piece/photo and board layouts. Tracking is off by default and saved with the wardrobe under Your closet in View settings. Manual Ready to wear / Needs laundry status supports single-piece and explicit mixed-selection batch actions, field-aware Undo, and failed-save retries. The closet filter and thumbnail badges show laundry needs without adding ready badges to every piece. Disabling tracking retains status and care records.

Care is collapsed above Original listing. Washing, Drying, and Care note save with Save changes. Add care label photo saves a reference immediately while retaining unsaved form entries; label photos share the gallery but cannot become the main photo, supply swatches, enter photo cleanup/background removal, or appear on boards. Reclassifying a main photo chooses another garment view or a no-photo placeholder. Labels count toward the existing 12-photo limit. Photo removal retains the asset and offers Undo.

Lab and the board tray default to Ready to wear only when tracking is enabled; the explicit filter still applies in Fantasy mode. Lab's preference persists in the browser. Skipped clothing counts use the otherwise eligible base pool. Saved outfits and boards retain their pieces and show informational laundry feedback; the board reveals affected pieces in place. Trip packing rows flag laundry needs without excluding pieces from future plans. Wear logging, ratings, My Taste, Sky, and wishlist compatibility evidence do not change. Lab selection is now **2.1.0**; historical ratings retain their original version.

🗄️ identifies the top-level Stashed pieces menu, 📦 identifies storage, and 🎁 identifies donation. New modal actions also exposed an existing issue with native dialogs making the external Undo toast inert. Toasts now live inside the active dialog, return to the underlying dialog/body on close, and retain their node through dialog rebuilds.

Full JavaScript regression, synthetic storage/import/backup tests, and bounded desktop/390-/502-pixel Chrome checks cover the batch. Physical phone acceptance remains pending. No new package or deployment.

#### Settings and cleaning copy · review

The daily-fortune checkbox and its restore link now sit in Your closet, alongside logo visibility and Enable laundry tracking. This moves the controls without changing their persistence. Piece actions and the top notice use Needs cleaning / Set as clean; the sidebar filter, badges, saved-outfit notices, packing rows, and batch choices use matching cleaning wording. Lab/tray Ready to wear filters retain their availability wording. No selection algorithm changed. Focused laundry, themes, daily-card, and icon-pack checks pass; this copy/placement batch awaits visual review.

#### Linty voice pass · approved cleaning copy and further review

Applied the reviewed success toasts: “Needs cleaning. Banished to the hamper.” / “Set as clean. Released from hamper jail.” Single-piece and bulk actions retain Undo and factual failure/retry messages. Care label upload now uses “Care label saved. Tiny scroll acquired.” after success, with the shorter Care label saved inline status. The top piece banner remains plain Needs cleaning / Set as clean.

A genuinely empty cleaning list says “Nothing needs cleaning. The hamper is appeased.” This checks the full wardrobe; when cleaning-needed pieces exist outside the current filters, the message remains “Nothing needs cleaning with these filters.” Focused laundry, bulk/Undo, and modal-toast checks pass, and the embedded module is in sync. This copy batch was not browser-checked.

The existing creative backlog's CRE-08 and ongoing voice pass call for occasional personality in helpful hints, empty states, and successful actions. Keep navigation, action labels, measurements, destructive confirmations, and save errors literal. Be kind to bodies, budgets, taste, and personal cleaning routines. Do not use the daily-fortune checkbox as an implicit switch for unrelated UI voice. No new voice setting or extra persistent helper paragraphs were added.

The follow-up reviewed copy is applied: empty closet “Every good pile starts with one piece.”; empty board “Add pieces from your closet. Mischief starts here.”; plain “Piece added.” for manual owned-piece additions; and image-export success “Image saved. A little wardrobe artifact.” Wishlist/Fantasy notices remain intact. Avoid “hoard” in these lines.

Applied the reviewed Lab loved-outfit toast: “♥ Loved. A keeper for the good pile.” Add to board remains available. This is an outfit rating, not a single-piece favorite or a save to Your outfits. No rating or selection behavior changed, so no algorithm version bump is needed.

Existing voice worth keeping: Collections' “Gather a few pieces and give the pile a name” and “A very good little pile”; Lab's “No treasures in this pile yet”; Sky's “Linty is watching this corner”; and Trips' trip-fairy/suitcase copy. Daily fortunes and the Oracle already provide larger personality moments. Avoid adding a second mascot voice to every trip step.

Keep board recovery and saved-outfit identity messages factual: they explain what was saved, what is being edited, and whether other work is retained. Likewise, leave backup completeness, partial imports, wear history, fit, wishlist evidence, errors, and destructive warnings precise. Do not add jokes to autosaves or repeated redraws. Packing completion could be a later opportunity if an explicit completion state is introduced; this pass adds no new behavior for a quip.


#### 0.3 board/recovery review · 26 October

Fixed three issues in existing flows: New/Undo New can no longer leave an unresolved outfit-save retry behind; collage deletion Undo restores empty windows without overwriting later layout choices; and clearing a title during Save is preserved as a newer edit. Failed-save feedback explicitly asks the user to keep the tab open. Synthetic regression coverage and the full JavaScript suite pass; this is not final-package or physical phone acceptance. See BOARD-EDITOR.md for the exact boundaries. Continue reviewing the implemented features and phone findings; no new feature scope, packaging, or deployment.

Earlier Trips saving remains a tentative future improvement: allow a named, incomplete plan to be saved and resumed, with a clear distinction from a generated plan. Review required fields, validation, and complete save scope before implementing. Do not add it to the 0.3 review.

#### 0.3 laundry/care review · 26 October

Fixed overlapping care label uploads: changing care fields or refreshing photos no longer unlocks Add care label photo while an upload is pending. Failed uploads release the control and preserve unfinished care entries. Bulk cleaning now counts only successful changes, excludes unchanged pieces from the updated count, and says Nothing changed when the selection already has the requested status. Care upload and the top Set as clean action have 44-pixel minimum heights.

Synthetic regressions and the full JavaScript suite pass. Bounded Chrome checks at 390, 700, 820, and 900 pixels cover representative Soft Hardware, Field Notes, and Night Bloom layouts in light/dark and text-only modes. Verified status/Undo, injected save and Undo failures with Retry, care save/reopen, upload with unfinished fields retained, Lab replacement of an unavailable suggestion, independent Lab/tray filters, and board notice/eligibility refresh without removing placed pieces. Existing availability rules are unchanged; Lab stays at 2.1.0. These checks do not replace physical phone touch acceptance. No new features, package, or deployment.

#### 0.3 Sky/share/fortune review · 26 October

Fixed cached daily reminders that survived hiding/removing a piece or moving it to the wishlist. Cached Do reminders also respect storage; the existing neglected-favorite reading can still refer to stored pieces. Same-day replacement preserves reveal/dismissal choices. Generation rules and algorithm version 1 are unchanged.

Sky export now blocks duplicate export taps, uses the encoded layout in the filename, reports conversion/share errors, releases controls after errors or native-share cancellation, and cancels a still-pending export when its sheet closes. Share-layout hover/pressed feedback survives theme overrides. Sky share/Close controls and fortune dismissal have 44-pixel minimum targets; small fortune cards reserve clearance beneath dismissal. Sky formula remains 2.0.0.

The full JavaScript suite and four Sky Python tests pass, with additional focused cache, save-failure, and export-recovery regressions. Synthetic Chrome checks at 390, 700, 820, and 900 pixels cover representative light/dark themes, text-only Sky actions, map/detail return, contributor batches, Square/Story export, fortune reveal/reload, dismiss/restore, enable/disable, search exclusion, and the smallest grid density. Downloaded 1080×1080 and 1080×1920 images were inspected. Native phone share-sheet behavior is covered by simulated API responses only and still needs physical device acceptance. No feature additions, package, or deployment.

#### 0.3 Trips save/recovery review · 26 October

Fixed shared references between opened and saved trip settings/checkmarks, plus false unsaved warnings for older partial occasion settings. Explicit Save now captures detached data, blocks duplicate requests, preserves title edits made during the request, and reuses a reserved trip ID on retry. First Save still happens after plan generation and adopts the saved trip URL; no earlier/incomplete-trip saving was added.

Packing autosave uses a separate timer per trip, serializes writes with explicit Save, retains edits arriving during a write (including first Save), and leaves unsaved trip details alone. Failures retain the current checkmarks and show persistent feedback with Retry. Pending/failed packing changes count as unsaved; leaving during a write is blocked, and confirmed discard cancels delayed packing writes. Save status distinguishes saved packing from remaining unsaved trip changes. Delete/Undo now snapshots the latest saved record rather than a stale rendered card.

Added focused save-state and routing regressions; the full JavaScript suite passes. Synthetic Chrome checks at 390, 700, and 900 pixels cover mobile/intermediate layouts, representative light/dark themes, text-only actions, packing save/reload, injected autosave and explicit-save failures with Retry, delayed-save navigation, newer title preservation, delete failure, and failed Undo followed by successful restore of packing progress. The phone header places the name above aligned Edit/Save actions with 44-pixel targets. Physical device acceptance remains separate. No planning algorithm/schema change, feature addition, package, or deployment.


#### 0.3 Wishlist evidence review · 26 October

Fixed one-piece compatibility missing cardigans normalized under Tops and other recorded layers. Mixed palettes with a multicolor placeholder no longer count as wholly neutral merely because a known accent is neutral; explicit shared colors remain useful. Wishlist analysis is now **2.1.1**. Similarity still requires the same category/subcategory, exact known palette, and a shared descriptive tag. Favorites, recent distinct wear dates, and latest-per-combination positive Lab ratings provide qualified context, without changing preference scores or order. Lab and Sky versions are unchanged.

Head-to-head now refreshes live records/evidence while retaining valid pair IDs after wardrobe edits. Keyboard activation of its nested Open details control no longer submits a preference. Wishlist details, price, and section-move targets are larger on mobile/intermediate screens, and comparison actions clear the fixed bottom navigation.

Focused regressions and the full JavaScript suite pass. Synthetic Chrome checks cover Ranking, Compact, and Head-to-head at 390, 700, and 900 pixels across representative light/dark themes and text-only controls, long titles/notes, evidence wrapping, details via Enter/Space without rating, and saved edits refreshing the same comparison pair. Physical phone acceptance remains separate. No new features, package, or deployment.

Future packing-list work also includes a [Trips copy/UX review](https://trello.com/c/sisNiYF6), especially packing progress versus planned outfits, approximate bag-space guidance, repeated helper text, and mobile presentation. Keep this alongside the packing-list additions, outside the 0.3 fixes/checks scope.


#### 0.3 direct assistant import setup · 26 October

Added the approved direct import workflow fix. Set up direct import supplies the running installation's actual folders, computer, shell commands, intended wardrobe identity, and photo-readiness information. It explains local Claude Code and ChatGPT/Codex sessions, cloud/GitHub limitations, phone remote-control prerequisites, and independent source-photo/email/browser permissions. A setup-only request records a real local check before Continue is enabled; valid setup can be reused, and every import request rechecks access/identity.

Direct requests now use the CLI contract and schema, exact preview/apply/status commands, a batch working folder, and a stable batch ID. They do not include browser ZIP instructions or silently switch routes. The importer enforces the expected wardrobe identity inside its transaction, including completed-batch retries. Check import reads the committed receipt, distinguishing saved additions from checks/previews and zero-new-addition retries. Pending batches resume after closing/reloading; saved results appear first, with guarded Load saved additions and a new-ID Start another import action. Checks have bounded timeouts and recoverable errors. The existing local request authorization protects installation metadata; no remote write bridge or assistant credentials were added. Algorithm and storage-format versions are unchanged.

A fresh assistant context received only the generated setup/import requests and two named synthetic photos. It verified setup, previewed and saved two owned pieces/two photos, checked the receipt, and retried the identical batch with zero new additions/photos. The app independently confirmed the original receipt and loaded both pieces. Browser checks cover 390-/700-/900-pixel layouts, both provider guides, pending-batch recovery, verified setup reuse, and an injected check failure/retry with the same batch ID. Full JS and 111 supported Python tests pass at the review checkpoint, with focused checks after final UI/transport refinements. Physical phone and actual Claude-client acceptance remain separate. No package or deployment.


##### Shared bulk-import sources review

- Source uploads now work across photos, emails, product links, order/wishlist pages, and store exports. Local batches retain uploads and per-item product photo guidance; no piece is created by uploading.
- Local Codex/Claude Code receive exact paths. The optional image-editing request preserves originals, labels recasts, and reports unavailable editing rather than promising it. Chat imports can reuse originals by batch-scoped source ID and return only newly edited photos.
- One source photo per item in the upload UI; screenshots/references are separate from items. Keep existing multi-photo import compatibility for older files.
- Release check: exercise phone upload → fresh local assistant → verified saved result with the user's chosen assistant. Synthetic tests cover source access and save behavior; they do not certify image-generation quality or every provider's account/tool availability.


##### Bulk import/photo completeness review · 26 October

- Changed visible unit labels from Imperial to US; saved unit preferences and conversions are unchanged.
- Closed the sparse-tag prompt gap for every source, provider, and direct/file route. The shared request now explicitly asks for supported visual/style tags, distinguishes Occasion (`styles`) from Aesthetic (`looks`), and leaves unknown factual details blank. Both vocabulary contracts now include field labels and category/subcategory scopes. Existing tag storage already supported these fields; no algorithm or import-format version changed.
- The current flow includes shared retained uploads, optional per-item isolated photos and guidance, original/recast handling, destination/setup checks, duplicate review, save retries, and committed-result verification for direct imports. File imports reuse staged originals and support edited photos in a returned ZIP.
- Remaining acceptance: a fresh request with the updated tagging instructions, actual image-editing quality, file route round trip with an assistant’s returned ZIP, and physical phone review. Windows/macOS execution remains unverified. Existing synthetic checks are not proof of each provider’s tools or permissions.
- Known limits: no automatic retagging of saved pieces; duplicate updates preserve tags/photos. File route retry state survives only in the open review, without direct import batch receipts. Shared uploads do not grant an ordinary chat local access, run an editor, or become saved pieces by themselves. These limits should stay explicit; do not expand scope to a new editing service or bulk metadata-update feature during this review.


##### File import acceptance and tag repair · 26 October (27 October UTC)

- Exercised the file route through the real browser UI in an isolated synthetic installation: upload two sources, select isolated-photo guidance, generate the request, return a ZIP with a recast fixture and batch-scoped original references, edit tags in review, trigger a write failure, retry, save, reload, and reopen a portable ZIP for duplicate review. Original/recast order, main photo, ownership, tags, unknown sizes/prices, unchanged assets on retry, and zero duplicate additions were independently checked in saved storage. The returned ZIP was a test fixture, not a new provider-generated result or image-quality assessment.
- Fixed a misleading zero-save recovery heading and finish button, and made the completion summary say existing updated for both existing piece updates and wishlist promotion. Added spacing around upload helper text, download buttons, category fields, and photo/tag details. Review names use the full card width on mobile and intermediate layouts.
- Visual checks: 320px Workshop dark (loader, recovery, and review), 390px Field Notes light (uploads, handoff, review, and saved results), 760px Field Notes light (two-column review/comparison), and 1280px Workshop dark (review and comparison). Later name-layout refinement was verified at 390px and 760px. Checked footer targets, wrapping, and horizontal overflow; physical phone touch acceptance remained pending at this checkpoint.
- Future idea only: [multiple uploads per piece, especially care labels](https://trello.com/c/HVjlRV1y), in Trello Ideas with Later. Preserve grouping, distinguish reference labels from garment/main photos, and support both direct and file routes. No multiple-image uploader was added to 0.3.


##### Calendar overflow and remaining review · 26 October (27 October UTC)

Fixed horizontal scrolling in the calendar day dialog: its saved-outfit selector now shrinks within the row, removes the inherited left margin, and wraps alongside Log it at narrow widths. The dialog still scrolls vertically when needed; overflow is not hidden as a substitute for sizing. Scoped button sizing/wrapping preserves the current theme.

The label Plan an outfit was ambiguous: it could suggest creating a new outfit rather than scheduling a saved one. It currently schedules a saved outfit, while Log records a past/today wear. Renamed the calendar action and chooser to Schedule a saved outfit, and the specific-outfit title to Schedule this outfit. Calendar-to-board creation is not implemented and was not added during this fixes-only pass; it would need explicit date propagation through board drafts, saving, and recovery.

Synthetic Chrome verified the day dialog at 390px and 1280px in Field Notes light with a long selected outfit name: scrollWidth equals clientWidth at both widths. The scheduling chooser also stayed within the mobile dialog. No plan or wear was written, and no personal wardrobe data was used. Focused theme, saved-outfit, Trips-navigation, and app-routing checks pass.

Remaining before release preparation:
- One focused controls/settings review: Getting started, closet autosave/retry, units/history, piece/collection actions, and Random/palette behavior. Existing checks exist; this is final acceptance and fixes, not a request for more features.
- Calendar/wear logging interactions beyond this layout check, including scheduling versus actual wear, remove/undo or failure behavior where supported, and navigation back to the calendar.
- Physical phone acceptance, including native sharing and actual assistant photo/tagging output. Browser fixtures do not certify provider tools, image quality, or physical touch behavior.

Then resume release preparation: clean settled snapshot/diff, current documentation and known limits, final regression/security checks, and an extracted fresh-install/0.2-update/backup-restore checkpoint when packaging is requested. The early rc.1 predates these changes. No packaging or publication was performed.


##### Calendar to board · 26 October

Create an outfit for this day now opens a separate dated board after checkpointing the active work. Save & schedule saves the outfit and date together, retries the same target after a lost response or reload, and returns to the selected day only after success. Back to calendar checkpoints the unfinished draft without scheduling it. Current work remains available through Other drafts. An injected browser save failure exposed a global-flush retry ordering issue, which is fixed and covered. Mobile/intermediate/laptop checks used synthetic data only. This implements the explicitly approved calendar handoff; weather/fitness integrations remain future considerations. Getting started menu placement was discussed separately and has not been changed.


##### Import scope and continuation · 27 October

Removed the ten-piece default from both import routes. The optional limit starts empty; direct requests work through their selected scope in sequential, atomic save parts, and Check import combines verified committed results separately from the assistant-reported completion/needs-input/paused state. Reopening restores request choices even without uploaded files. Stable part receipts retain safe retries, cross-part duplicate checks, tags, and backup restoration. A completed request rejects new parts; legacy single-batch requests remain readable. File requests can return numbered files, and Load next file retains staged originals during the open review. First/new requests reuse verified setup without inheriting a piece limit. Existing already-copied requests remain unchanged; restart the server and refresh before preparing the new workflow.

Common tagging instructions remain in every source/route. Unrelated pieces in one photo need clarified intent or manually prepared crops. Confirmed multipacks now use the subsequently approved preparation options below; no multi-view uploader was added. Store is free text with the last entry remembered. Temu and Amazon product-link normalization is matching support, not store integration certification. Documentation now distinguishes generic handoffs from unverified retailer examples; future coverage is [backlogged](https://trello.com/c/CMpNPWqK), labeled Later.

Validation: full JavaScript unit suite, focused rechecks after UI refinements, 29 focused Python tests (11 assistant/request, 14 piece-import, 4 source-upload), embedded setup sync, and whitespace checks. Synthetic Chrome checked a 55-piece/two-part paused request, original saved scope after reopening, completed aggregate result, reusable setup/new blank limit, and 390/760/1280-width layouts. No personal wardrobe, live email source, paid assistant run, packaging, or deployment.


##### Multipack and product photo preparation · 27 October

Added two independent, initially unchecked choices to every source and both import routes: Separate multipacks into individual pieces, and Create an individual product photo for each piece. Record splitting alone keeps original photos; photo creation includes separating confirmed pack members onto plain backgrounds. Normal pairs stay together, quantities alone do not establish contents, each resulting record counts toward the optional limit, and pack totals are not copied to every member. The existing tagging pass remains common to every route.

Global photo choice updates uploaded item choices; individual uploads can override it and retain photo guidance. Request choices persist through reopening, and new requests reset them. The assistant may follow explicit later user changes; returned photo-request metadata represents the final choice. One original per piece plus an optional recast remains the image contract, with shared pack originals allowed. There is no independent image-splitting checkbox, new image service, or automatic model-photo recoloring.

Optional productPhotoRequested/photoNote notices are retained in file review/results and direct receipt photoStatus, not garment tags. Missing/declined/failed image editing falls back to originals and explains the assistant-reported reason. The image-capable ChatGPT/Codex workflow is the intended complete path; other available editors are supported by the request. Real editor availability and output quality still require actual-session acceptance.

Validation: full JavaScript suite, focused setup rechecks, 31 Python import/request/source tests, source sync, and whitespace checks. Synthetic three-beanie preview/apply/retry produced three variants with one shared original, no retry duplicates, retained tags, and visible fallback explanations in Check import. Synthetic Chrome checked both selections, per-upload inheritance, generated request, a new request resetting both choices, and 320/390/760/1280 layouts across Field Notes/Workshop light/dark. No personal wardrobe or actual AI image-generation run was used.

##### Setup spacing and saved-outfit scheduling · 27 October

Tightened closet checkbox spacing, separated setup tabs/headings and Trips helpers/actions, and made setup dropdowns fit their options instead of stretching across the dialog. Getting started now uses shorter helper text and no longer suggests a small import batch. “Setup optional photo tools” shows a green check after a successful check confirms both browse previews and background removal; a subsequent unavailable/error result clears it, and checking remains repeatable.

Scheduling an already chosen outfit now asks only for a date and optional event name, with a View calendar action after successful saving. Editing preserves older location/weather/dress-code metadata. Detailed planning remains in Trips, including one-day trips. Focused regressions cover failed scheduling saves/retries, metadata retention, calendar navigation, photo readiness, and existing direct/file import variations. Synthetic Chrome checked setup at 390 and 1280 pixels, compact closet settings at 390, and scheduling/save/calendar return at 390. Trips spacing was source-reviewed, not re-exercised visually in this pass.

Remaining acceptance stays focused: settings autosave/retry and measurement/history controls, piece/collection actions, Random/palette acceptance, and calendar wear-log removal/undo/failure behavior; continue physical phone review. No new release package was built.

Future brainstorms only: [monthly calendar keepsake/export](https://trello.com/c/7z2XgHsQ) and a separate [year-end wardrobe recap](https://trello.com/c/g4d0jXUd), both in Trello Ideas with Later. Use recorded wear, distinguish plans and taste ratings, show gaps honestly, and avoid making completeness claims from sparse logs.

##### Release preparation resumed · 27 October

Release preparation resumed. The former “controls/measurements, piece/collection actions, Random/palette, and calendar recovery” labels describe spot checks of existing behavior, not unfinished features. Focused coverage includes settings save failure/unit-history preservation, collection membership/actions, stable Random order, palette Undo, and calendar scheduling/save/retry. A calendar wear-write failure found during the final pass is fixed: failed piece writes no longer produce a successful outfit log, open-tab retry preserves added-date provenance, duplicate taps share the request, and failed removals remain retryable. Keep the tab open for partial wear-save recovery; this is not a new atomic storage transaction. Final visual acceptance remains ongoing.

Prepare an unpublished 0.3.0-rc.2 snapshot, verify its extracted source/tests, fresh installation, and synthetic update/backup restore, and record advisory/secret checks beside that exact archive. Preserve the existing development and earlier release worktrees. The snapshot is an audit artifact, not a selected release commit; final integration/diff approval, CI on that commit, final production rebuild, and publication approval remain concrete gates. Do not repeat completed feature reviews without a failure or new reported issue.

Prepared 0.3.0-rc.2 as an unpublished isolated audit snapshot. Its 200 manifest hashes, extracted JavaScript suite, all 122 Python tests, fresh core startup, synthetic published-0.2 update and full backup restore, npm/Python advisories, and snapshot/history secret scans passed. Exact-candidate browser smoke confirmed restored photos, outfits/history/plans, daily card presence, and Sky/share preview. The download notification timed out, so actual saved Sky image/native sharing remains a concrete acceptance check. Clean release-commit integration/diff review and CI, physical phone acceptance, final production build, and publication approval remain; details and the exact hash were recorded with that candidate in a local sidecar report.

##### Next dev-site update: notice wording

On the next dev-site change, use this exact notice: “stephthegeek's wardrobe, running the latest Closet Lint code. Changes are only in your browser. See the included 12-piece demo →”. Keep the demo phrase linked to https://demo.closetlint.com/. Apply through the shared source/exporter, not by hand-editing deployed HTML. This is queued copy for the next update; do not deploy solely for this wording.


##### Queued dev notice links and next-release action review · 27 October

Keep the queued notice wording, with lowercase stephthegeek linked to https://stephthegeek.com/, Closet Lint linked to https://closetlint.com/, and “See the included 12-piece demo →” linked to https://demo.closetlint.com/. Apply on the next dev-site change; no wording-only deployment requested.

[Review action order and grouping](https://trello.com/c/Z11t4m9F) is in Ideas with Next · tentative, explicitly outside 0.3. Start with piece pages, then inspect collections, saved outfits, Board tools, Trips, and Photo options. Inventory frequent/secondary/destructive actions and propose their grouping before moving buttons. Delete should be placed deliberately at the end or separately, with related hiding/removal actions grouped where useful.

Documentation review corrected the 0.3 installation example, distinguished ordinary open-tab retries from durable dated-board/import receipts, added laundry to the README, clarified that wishlist order is user-controlled, explained both import routes and optional pack/photo preparation, and softened the photo-editor promise. These are source changes for the next candidate; rc.2 remains an immutable earlier checkpoint.

##### Dev garment sizes · 27 October

The public exporter gained an explicit `--include-sizes` option, checked against the export manifest. Sizes remain omitted by default, and body measurements and the personal fit profile remain excluded. An approved development-demo export retained the existing photos and records while adding recorded sizes. Tests cover the opt-in, default omission, private-profile exclusions, and manifest tamper refusal.

##### Final filter/label fixes · 27 October

Completed the agreed Size not recorded / Not applicable / One size cleanup with consistent counts/results, one shared one-size choice, and compatibility for older one-size selections. The main + menu button now says Add; submenu actions remain specific. Focused behavior tests and synthetic 390/1280 layouts pass. Next step is the isolated release-branch integration and exact-commit CI, incorporating the documentation pass and approved dev-export size fix; no new feature scope.

The integration checkpoint based on published v0.2.0 passed the full JavaScript suite and 123 Python tests. Remote CI, final packaging, and publication had not completed at that checkpoint; the published 0.3.0 release supersedes that status.

## Almanac preview


This section describes a development preview, not a feature planned for 0.4.

In the preview, open **Menu → My almanac**. The Profile tabs bring together **My almanac**, **Sizes & fit**, and **Settings**. The gear beside My almanac in the menu opens Settings directly.

### My month in color

The calendar shows the days you logged pieces or outfits. Each logged day uses up to two of the most frequently recorded colors among its pieces; these come from saved color tags, not photo analysis.

Tap a past day to see its wears or fill in a missed day. You can log individual pieces or a saved outfit. Future days cannot be logged as worn; use the [outfit calendar](../USING-CLOSET-LINT.md#wear-logging-and-the-calendar) to plan them instead.

Use the calendar’s image button to save the month as a PNG. The weekly dots in the menu provide a shortcut back to the almanac.

### Today’s Sky and wardrobe prompts

Choose your city and °F or °C in **Settings**. Today’s Sky brings together local sky events, daylight, weather, and a daily wardrobe prompt when enough relevant information is available. Weather needs an internet connection. Missing information can limit what appears.

Daily wardrobe prompts exclude Off-duty and intimate categories. The daily reading stays consistent through the day. It uses your recorded pieces, tags, and history; incomplete logging may change how useful a suggestion is. **Open** leads to your Style Sky chart.

**My next trip** shows the next trip and its outfit-planning progress. **My taste** links to patterns from your Lab ratings. These sections become more useful as you record trips and rate combinations.

### Sizes & fit

Set the sizes you wear for the **Fits me** filter. Add measurements when useful; unknown details can stay blank. Changing a preference or measurement does not alter the sizes recorded on your pieces.

### Settings

Choose the closet name, category visibility, laundry tracking, display preferences, city, and temperature units here. Closet settings travel with wardrobe backups; theme and display preferences belong to this browser. See [themes and display preferences](../USING-CLOSET-LINT.md#themes-and-settings) for the distinction.

## Contributor reference: Profile and Almanac preview

The following notes describe the later development preview and its implementation; they do not expand 0.4 scope.

The daily almanac selector is **1.1.0**, separate from the existing Style Sky scorer and Linty’s daily fortune. Source: `app/scripts/almanac.js`, `app/scripts/profile.js`, and `app/styles/profile.css`. Run `python3 tools/sync_profile.py` after changes; the pinned MIT Astronomy Engine 2.1.19 browser build is embedded to preserve offline calculations and the existing script security policy.

Profile routes and tabs retain the existing settings controls, measurement records, fit semantics, board, and wear log. No storage migration is required. New `profile/sky-location` contains the selected city label, coordinates, IANA time zone, and F/C preference. Existing trip temperatures remain stored in Fahrenheit; display and editing convert at the UI boundary. City selection uses the existing Open-Meteo lookup, extended to retain a validated time zone. `/api/sky-weather` proxies a bounded, hourly cached forecast. Weather failure leaves astronomy and closet signals available. Public browser builds use the same provider directly, as Trips already does.

### Selection and evidence

Big local sky dates take priority: visible eclipses, hemisphere-aware solstices/equinoxes, clock changes, full/new moons, and the first minute-rounded earliest sunset of the winter stretch. Harvest/Hunter’s and Blue Moon overrides are computed, not hardcoded by year. Phase, illumination, sunset, daylight duration, and daily change use the city’s local civil day; polar missing-rise/set cases stay unavailable rather than inventing times. Clock changes are detected from civil-day duration, not a US-only calendar.

Closet thresholds are in `ClosetLintAlmanac.limits`. Score order is season swap, anniversary (favorite/wear preference), upcoming unplanned trip/event, color tide, rising favorite, loved unlogged Lab outfit, color drought, never worn, and early dark. All candidates require an applicable action. Wear evidence deduplicates piece IDs per date across piece wears and outfit logs, including archived outfit history. A color counts once per logged day. Labels use the existing color vocabulary. Unknown acquisition dates never become an assumed date; exact anniversaries require a non-approximate full date. Seasons use the existing tags and the selected city’s hemisphere. A loved Lab combination counts as worn when all its pieces were logged on one date. Trip progress counts dates with pinned outfits, not packing checkmarks.

No outside-until time is inferred. Early-dark copy uses a tunable sunset cutoff. No external tracker/calendar integration or new full Sky page is included. “Open” goes to the existing Style Sky, per the owner’s clarification.

A selected card is saved in `profile/sky-daily` with its local date, city key, and algorithm version. Retain about a month of choices; avoid the same closet signal for three consecutive local dates. Wait for all relevant wardrobe collections before choosing. The persisted card wins over session choices, including another tab’s saved choice. Normal wear/closet updates do not rewrite today’s reading. Invalid cities show the Settings prompt. New algorithm versions invalidate cached selections; unchanged versions must not be bumped for presentation-only changes.

### Calendar and interaction

Calendar and menu dots share one state/color renderer; the calendar uses the app’s existing local wear dates and Sunday-start week. Future calendar days are disabled. The layout stacks below 900px, and tabs scroll without wrapping. Logging individual pieces uses the existing atomic wear commit and exact-request retry path. Settings and measurement controls retain their original save paths; size picks save without an almost-fits tier. Measurement entry retains all optional existing fields, including height. Month PNG export uses Canvas and the existing download adapter.

New focused coverage: `tests/almanac.js`, `tests/test_sky_weather.py`, and Profile cases in `tests/url-navigation-app.js`. Existing measurement tests now exercise the measurement-entry dialog, reached from the new tab. See `TESTING.md` for visual checkpoints and limits.

### Selector 1.1.0 and debug preview

Today’s Sky uses Linty’s daily card `isActivePiece` eligibility predicate. This excludes underwear, lingerie, intimate subcategories, off-duty/sexy sections, swimwear, loungewear, activewear, costumes, and inactive pieces. Color evidence is rebuilt from eligible pieces only; loved outfits and storage candidates must also contain eligible pieces. The version change invalidates earlier saved daily cards.

The card appears above My next trip. Add `?almanacPreview=1` before the route hash to preview eligible readings for the actual current date and closet. Refresh advances a per-tab counter; Next preview advances without refreshing. Redraws keep the same preview. Preview mode ignores saved daily cards and never writes daily history. It cycles once the available candidates are exhausted; closets with only one eligible reading can repeat. Removing the query parameter restores normal daily behavior. Preview indexing does not change production ranking.

## Documentation consolidation · 31 October 2026

Consolidated the user guides into Getting started, Using Closet Lint, AI assistant imports and Oracle, and Web hosting. Contributor commands and durable state/testing contracts now live in the root CONTRIBUTING.md; dated board, performance, security, accessibility, wishlist, release-planning, and test records are preserved in this archive. Published and draft release notes and third-party terms remain separate. Updated generated direct-setup request paths, the photo tool help path, accessibility reference comments, and the package allowlist. Almanac remains a later preview; this documentation reorganization does not remove its code from the shared working tree or approve a release. Original pre-consolidation files are retained in a local sidecar archive.

## Almanac deferred from 0.4 · 31 October 2026

Removed the Profile/Almanac UI, routes, astronomy bundle, forecast endpoint, and feature-only tests from the release source. Preserved the latest implementation and later fixes in a separate local sidecar, along with its original integration patch and release-base hashes for later restoration. A three-way reversal retained subsequent PDF, board, category, wording, accessibility-landmark, and documentation changes. Settings and Sizes & fit return to their existing dialogs. Wardrobe profile records and measurements are untouched; this is a code-only separation, with no deployment. Accessibility coverage now exercises the restored dialogs rather than the deferred city/Profile views. Soft Hardware wishlist Move to controls now use the theme monospace font.

Withdrawal verification: the complete JavaScript suite and all 171 supported Python tests passed. The restored settings/measurement dialogs passed 24 accessibility scans with zero findings; all 26 keyboard/reflow checks passed. Twelve synthetic browser states covered both dialogs and populated wishlist cards at 320/1366px across three themes in light/dark. A narrow-card dropdown overflow found during that pass was fixed without changing its height, followed by passing wishlist/theme checks and the twelve-state recheck. The independent wishlist monospace and width fixes are retained in the restoration patch. The reapply patch was applied to an isolated copy of the release base and all 22 preserved files matched their expected hashes. Source inspection confirms the deferred modules, endpoint, and astronomy bundle are absent; recent PDF, outfit-grid, collection, and calendar-label fixes remain. This is not publication or hosted deployment.


### Packing PDF follow-up · 1 November 2026

The owner still reported an empty final page after refreshing the local app. The earlier body page assignment did not cover anonymous text at the document root. A browser reproduction added invisible text after the print sheet and outside the body; the previous build gained a third page after two content pages. Print mode now assigns the packing page to the document root and suppresses anonymous text line height outside the explicitly styled sheet. The regression fails against the prior build and passes 48 checks across three themes, Letter/A4, 90%/100% scale, photos, and outfit appendices. CI runs the new `test:print` command. This fix changes print layout only.
