# Developer checks and verification limits

Tests use generated test wardrobes and temporary data folders. Never run destructive checks against a real wardrobe. Passing tests is evidence for the covered behavior, not proof that the app is defect-free or that every platform works.

This is a contributor guide. Recorded results are evidence from specific development builds, not a claim that the latest source or every release passed every check. Test counts, browser limitations, and pending acceptance notes belong to their checkpoints. For installation instructions, see [INSTALL.md](INSTALL.md) and the experimental [hosting notes](HOSTING.md).

## Cleanup and recurring page headers · 2026-10-30

The three stale JavaScript fixtures now exercise the current behavior: control normalization loads the real icon module and models document fragments/SVG attributes, Sky loads the icon module and provides its canvas Path2D boundary, and Trips tests locate the explicit Add trip action through the current nested header. Their existing behavior checks remain, including SVG normalization idempotence, guarded navigation, and share recovery. The complete 78-command JavaScript/check suite passes after these repairs.

Page title controls now share 44-pixel minimum targets, 14-pixel labels, 500 weight, explicit icon gaps, and wrapping action groups. Changes cover Trips, outfit back/New/actions, batch import/photo headings, Collections, and Sky headings. Titles lead their headers, followed by wrapping actions; outfit previews and the Sky catalog now place their Back action in that same pattern. Existing tabs retain their layout, conditional actions remain hidden, and compact Sky sharing retains its established placement. A Trips heading rule previously applied baseline alignment to both its text and its button group; opting that group into centered actions fixes the SVG/text height mismatch.

Chrome review used a separate test wardrobe at 390, 768, and 1366 pixels. All three themes in light and dark were visually checked on the Trip header; back actions and Add/New controls were compared on Trips, Outfits, and batch pages. Tested import/photo Back navigation, unchanged saved trips, populated outfit preview navigation, and hidden photo restart controls. Header buttons measured 44 pixels with matching font sizes/weights, and the checked pages had no horizontal overflow. Settings and theme-only changes did not touch personal records. Existing automated recovery and Undo suites pass; this pass did not repeat every image-editing workflow or physical-device check.

The category picker now shares its used-category snapshot across all category groups even outside a memoized grid render. A focused regression verifies one wardrobe read per picker. Broader Trips/module extraction can wait until after the release review; this cleanup leaves selection/scoring behavior unchanged.

## Category catalog and adaptive visibility · 2026-10-30

The expanded catalog and View settings category tree were checked using a separate test wardrobe. Defaults keep specialist empty choices optional; saved categories stay available despite an off preference, while an unconfirmed import category is retained only in its review picker. Focused tests cover activation, reset, failed-save retention/retry, legacy values, and full backup/restore of preferences, classifications, tags, and wear history. Native select input/change ordering is covered so sweater type defaults cannot overwrite explicit role or layering choices.

Chrome checks covered 390, 768, and 1366 pixel widths, plus mobile screenshots of all three themes in light and dark appearances. Checked search, long labels, populated disabled rows, persisted preferences, focus after saving, category picker escape without changing the selected value, and saved/reopened sweater-vest roles. The search field now uses explicit theme colors, and resetting its search resets the inner scroll position. Hover/focus styles are scoped to this settings section.

The broad JavaScript/check run passed 75 of 78 commands. Previously recorded fixture failures remain in control-emojis (fragment DOM stub), ux-controls (old Trips structure), and sky-ui (missing icon dependency); this is not a clean full-suite result. The supported photo environment completed the Python suite's 169 cases: eight HTTP cases were initially blocked by sandbox socket permissions, and their two affected test modules passed with local-port access (five hosted and four server tests). Import and backup/restore checks passed. No live deployment or personal wardrobe changes were made.

## Hosted photos, update, and rollback · 2026-10-29

A synthetic 64-photo burst behind a briefly pending save reproduced HTTP 503 failures with the former 32-request gateway queue. The bounded queue now accepts 256 pending requests. Hosted cold previews return originals immediately while background generation continues; local preview waiting is unchanged. Failed internal thumbnail image requests get one browser-side retry against the original URL. Original failures do not loop, and remote/static image URLs are untouched. Large-response checks also caught accumulated backpressure listeners; the gateway now removes each listener pair when it resumes.

All five hosted gateway tests and all twelve thumbnail tests pass, including the real optional Pillow/WebP encoder. The JavaScript photo-thumbnail checks pass. The concurrent binary-stream test specifically rejects connection-listener warnings. The reported live thumbnail failures were not captured directly because browser automation was unavailable. The reproduced queue failure establishes one failure path, not the cause of every reported broken image.

The data-free hosted package was exercised over local HTTP with 420 MiB synthetic backups (140 random-pixel PNGs). Baselines were created with the published 0.2 storage code and with the preceding hosted package’s storage code, covering backup formats 1 and 2. Checks compare records, tags, individual wear dates, retained deleted-outfit history where supported, unfinished trips, board state, and every photo hash. They cover restart, atomic wear and retry, stale-save refusal, full export/restore, and rollback into a separate pre-update copy while retaining the newer backup. This establishes the tested rollback procedure; it does not promise arbitrary in-place downgrades.

Both 420 MiB baseline scenarios also passed through the package's private pipe on SiteGround, using separate synthetic folders. No personal records or live deployment settings were changed. The bulky hosted test data was removed after preserving the reports. See [hosting](HOSTING.md) for the repeatable command and manual deployment checklist. Public dashboard deployment, password protection after a new deployment, and idle restart are separate acceptance checks not completed in this pass; a local gateway or hosted pipe result cannot substitute for them.

### Public hosted follow-up · 29 October 2026 (Pacific)

A fresh SiteGround test project passed an update from the prior hosted package using a database created by 0.2, followed by rollback to the prior package and a separate restored pre-update database. The newer test data remained separate. Public HTTPS checks covered atomic wear/retry and stale-save refusal, 64 concurrent cold photo previews, and a 420 MiB backup download. Restoring that downloaded backup preserved records, board state, and all 140 photo hashes.

Whole-site password protection continued to block signed-out app, API, photo, and backup requests after another deployment. After the test worker was observed stopped during idle, an authenticated browser visit started a new worker and recovered the saved calendar and board. A calendar day dialog at 390 pixels showed the individual-piece logging helper without horizontal overflow. The main installation was then updated, its saved content matched the pre-update backup, and all 38 images in the checked calendar month loaded. A fresh backup was verified and copied off-host. These checks establish this maintenance procedure on the tested setup; they do not change SiteGround’s stated lack of support for Python child processes or establish compatibility with other providers.

## Stale browser saves · 2026-10-28

Record and board writes use content-version preconditions checked inside the SQLite write transaction. `test_stale_writes.py` covers two editors, stale deletion, old-tab rejection, creation collisions, exact lost-response retries, independent records, direct-tool changes, and simultaneous connections. `runtime-conflicts.js` covers retained unsaved edits/layouts, closing warnings, same-tab queued edits, conflict retries, and old-backend protection. Existing restart and autosave recovery checks remain passing. The full supported-Python suite passes (159 tests).

Real Chrome checks used two tabs against a disposable synthetic wardrobe: one saved size L, the older tab's size S was rejected and stayed in the open editor, and storage retained L. A separate board check retained the first tab's saved name/layout while the old tab kept its unsaved board and displayed the conflict. No personal wardrobe was used. Conflict recovery requires reviewing a fresh tab; it does not merge or force old edits over newer saves.

The wider JavaScript run also found pre-existing fixture failures in control-emojis, trip-export, ux-controls, and sky-ui; these involve their DOM stubs/function extraction, not the changed save boundary. They remain outside this fix. Record the focused passing checks and these limits rather than claiming a clean complete JavaScript run.

## Run the automated checks

With Node/npm and Python available:

```bash
npm test
```

This runs JavaScript checks plus Python storage, import, sample, and HTTP-handler tests. The default app needs no npm installation. Photo-import tests require Pillow; install `runtime/requirements-import.txt` into your chosen Python environment and run the tests with that environment active. Some optional photo checks skip when dependencies are unavailable; inspect the test output.

For focused changes, run the relevant existing test rather than repeating every suite. Use the full suite for storage, import/export, cross-cutting behavior, or release checkpoints.

Coverage includes:

- Navigation, preference persistence, filters, collections, board/outfit isolation, layering, and packing behavior.
- Bookmarks, Back/Forward, and guards for unsaved piece, collection, outfit, and trip edits.
- Import validation, duplicate handling, image metadata, retry/idempotency, and transactional failure behavior.
- Existing-piece photo preparation: local and returned ZIP results, exact IDs, preserved originals/tags/history, stale-photo rejection, atomic saves, retry receipts, and the split handoff.
- Storage persistence, full backup/restore, missing-photo rejection, recovery snapshots, and rollback.
- Unsafe text/URLs, poisoned JSON keys, malformed archives and image headers, request tokens, origin/Host checks, and CSP generation.
- The 12-piece sample’s taxonomy, photos, export/restore, and refusal to replace a nonempty wardrobe.

HTTP-handler tests use in-memory connections. They do not replace a listening-server test. JavaScript VM tests do not verify native dialogs, focus behavior, rendering, or mobile keyboards.

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

## 0.1 candidate verification

The release branch excludes Sky. The development build and dev site retain it; checks of those builds do not establish that Sky is part of 0.1.

Completed on the candidate:

- GitHub Actions passed the full JavaScript suite, 53 Python tests, dependency advisory checks, public-source checks, and full-history Gitleaks scanning. Actions are pinned to commit revisions.
- A separate Python 3.10 CI job passed core runtime tests and sample initialization, startup preparation, and backup export without optional packages. The full suite also runs on Python 3.12.
- On Linux with Python 3.14, a freshly extracted ZIP started a listening server without site packages. Its manifest matched its files, and its source contained no embedded wardrobe or Sky modules.
- A browser downloaded a full sample backup containing 12 photos, a saved outfit, and a working board. Cancelling restore preserved a sample edit. Confirming restore reproduced the backed-up catalog, collections, and board exactly; the automatic recovery snapshot retained the replaced edit. Updated extracted source reopened the same data successfully. This checks source replacement, not a general future-version migration or downgrade guarantee.
- Browse-title padding and theme typography were checked at 390 × 844 and 1300 × 900 across all three themes in light and dark. Lab accessory labels, shoe preservation while accessorizing, and positive-first My Taste ordering were checked with synthetic data.
- A read-only performance pass used an existing 1,100-piece wardrobe at 390 × 844 in desktop Chrome. Search, category filtering, scrolling, and board-tray search responded without a visible stall. Browse mounted 60 cards plus its loading sentinel rather than the whole wardrobe. This was a bounded observation, not a hardware benchmark or physical-phone test; long board-tray and Lab lists remain future optimization work.
- The optional photo worker uses direct U²-Net/ONNX inference and Pillow 13 or newer. A synthetic setup rehearsal and inference check passed previously, and the mask matched the former implementation without changing RGB pixels. The latest dependency advisory checks passed; a fresh optional-tool installation was not repeated during the final recovery pass.

The passing source/security and minimum-Python jobs are recorded in [this CI run](https://github.com/stephthegeek/closetlint/actions/runs/39668276536). Changes after that commit need their relevant checks.

Still open before tagging: StephTheGeek’s final physical-mobile workflow pass and resolution of any blockers it finds. Windows and macOS installation, broad assistive-technology coverage, and an independent human security audit have not been completed. State these limits in release notes rather than implying every platform or workflow has been certified.

See [the security review](SECURITY-REVIEW.md) for security boundaries and residual risks.

## Internal algorithm versions

Algorithm versions are independent of the app release and storage schema. Update the relevant version and behavioral regression tests whenever scoring or selection changes.

- **Lab selection 2.2.0:** sweater vests get a suitable underlayer unless an explicit standalone role or layering requirement overrides it. Pullover/cardigan/vest types stay under Sweaters. Top, bottom, and one-piece subcategories in optional workwear and cultural clothing branches use those Lab roles; ambiguous sets receive no inferred role. Unspecified sweater types remain unchanged. Version 2.1.0:  manual laundry availability now filters clothing, anchors, and accessories when Ready to wear only is active, including in Fantasy mode. This does not rewrite ratings, wear evidence, or wishlist compatibility. Version 2.0.0 introduced the following variety behavior; earlier selection was unversioned. Learned taste now uses transferable patterns rather than direct piece-ID rewards, with a reduced preference weight. The eight most recent distinct rated/skipped outfits contribute a soft piece-reuse penalty. Candidate signatures are deduplicated, and 20% of selection weight explores compatible outfits without taste weighting. Explicit anchors are exempt from the reuse penalty; minimum compatibility, blocked pairs, and already-rated/seen combinations remain enforced. Newly generated candidates and ratings made from them carry `algorithmVersion`; older/manual outfits remain unversioned rather than being relabeled.
- **My Taste summary 2.0.0:** earlier summaries were unversioned. Shows up to three positive observations, two passed-on patterns, and three repeat-loved pieces; ranks supported patterns ahead of tiny perfect samples and combines observations backed by the same outfits. Individual outfit examples remain paginated.
- **Sky formula 2.0.0:** tracked by `app/content/sky/scoring.json` and exported `scoringVersion`. No Sky scoring behavior changed in this Lab batch, so its formula version remains unchanged.

## 25 October release review

The 25 October review refinements add consistent piece-header toggles, white default board backgrounds, grouped outfit/design actions, layout-change confirmations and recovery, bounded My Taste summaries, Lab variety, and saved-outfit toolbar refinements. The full release JavaScript suite and all 94 synthetic Python tests pass after this batch. The proposed separate outfit-preview page and persistent draft switching are deferred until after 0.2; opening a different outfit still uses the existing unsaved-work confirmation. Final physical-device and cross-theme acceptance remains pending.

## 0.3 candidate preparation

The approved scope is Sky and the daily fortune, plus the completed performance/structure review. The development checkpoint passed the full JavaScript suite and 101 supported-Python tests. Focused checks passed after mobile retry-label and Fantasy mode CSS fixes. Synthetic browser checks covered URL-first startup, bounded outfit cards, board failure/retry, reload, New/Undo, representative themes at mobile and desktop widths, and opening Sky’s share preview. They did not verify a downloaded share image or the extracted 0.3 package.

Sky remains formula 2.0.0, and daily readings remain algorithm version 1; release preparation does not change their selection behavior. The deferred mobile transport stall reproduced with independent synthetic servers and remains unresolved. Windows/macOS installation and physical-phone acceptance remain open. Historical 0.1/0.2 exclusions above apply to those releases only; 0.3 includes both Sky and daily-fortune assets.

- **Wishlist analysis 2.1.1:** `WISHLIST_ANALYSIS_VERSION` tracks compatibility/overlap evidence only; personal ranking and Lab/Sky algorithms are unchanged. See `WISHLIST-ANALYSIS.md` and `tests/wishlist-analysis.js`.

## Laundry and care development checks · 26 October

`tests/laundry.js` covers wardrobe-level opt-in, failed settings/status saves and retry, explicit Fantasy-safe Lab pools, accessory eligibility, partial batch selection/retry, accurate changed/unchanged counts, field-aware Undo with later edits preserved, wear/status independence, saved care-note loading, care-upload locking through field/photo refreshes and failure recovery, and care-photo main-view fallbacks. `tests/board-tray.js` also verifies cleaning eligibility, explicit inclusion, and status retention when tracking is disabled. `tests/modal-toast.js` covers native-dialog hosting, nested close, queued-close/reopen races, and detached-node recovery. The existing gallery, navigation, board, and bulk-edit checks remain in the full JavaScript suite.

Synthetic Python checks cover import selection when a care label is first or the only image, validation, and full-backup round trips retaining laundry settings/status, care text, and reference photo bytes. Browser checks use only the isolated synthetic installation: desktop, 390-pixel, and 502-pixel widths; shared activation; care upload with unfinished fields preserved; save/reopen; gallery restrictions; in-modal removal/Undo; closet filtering; explicit batch Ready action/Undo; saved-outfit notices; and board/tray/Lab availability. Physical-device touch and release acceptance remain separate.

The laundry/care review repeated synthetic Chrome checks at 390, 700, 820, and 900 pixels across representative light/dark themes and text-only actions. Injected single-toggle and Undo write failures both recover through Retry. Cleaning and Undo update the board tray/notice while retaining placed pieces; newly unavailable Lab pieces are replaced, and the Lab override does not disable the board filter. Care save/reopen and photo upload preserve entered values. Care upload/top status controls now meet the 44-pixel minimum height. The full JavaScript suite passes; this review adds no selection algorithm changes or physical-device acceptance.

## Sky, sharing, and daily-fortune review · 26 October

`tests/sky-ui.js` now covers pending-export deduplication, layout/filename consistency, null/throwing encoders, unsupported/throwing/rejected native sharing, cancellation, recovery, and closing during encoding. `tests/daily-card.js` covers stale cached reminders for hidden/removed/donated/wishlist/missing pieces, stored Do reminders versus valid stored neglected favorites, preservation of same-day reveal/dismissal choices, and failed persistence retaining session state with accurate feedback. Scoring/generation versions are unchanged.

The full JavaScript suite and four `test_sky*.py` checks pass. Bounded synthetic Chrome checks use 390-, 700-, 820-, and 900-pixel frames, representative light/dark themes, text-only Sky controls, and the smallest fortune grid density. Downloaded Square (1080×1080) and Story (1080×1920) images were inspected, superseding the earlier checkpoint’s unverified-download limitation. Native phone share UI is simulated in automated tests; physical-phone and extracted-package acceptance remain separate.

## Trips save/recovery review · 26 October

`tests/trip-save-state.js` covers detached settings/checkmarks, failed packing autosave/retry, serialized writes with newer edits retained, explicit-save snapshots and title preservation, stable creation retry IDs, packing edits during first Save, independent trip timers, discard cancellation, in-flight navigation blocking, and latest-record deletion/Undo with restore failure/retry. `tests/url-navigation-app.js` also checks that first Save adopts the saved trip URL and that route navigation cannot abandon an in-flight trip write. The full JavaScript suite passes.

Bounded Chrome checks use an isolated synthetic SQLite wardrobe at 390, 700, and 900 pixels across representative Soft Hardware dark, Field Notes light, and Night Bloom dark/text-only layouts. Verified packing progress after reload, autosave versus unsaved details, injected explicit/autosave/delete/Undo failures and recovery, delayed-save navigation, title edits during a write, restored packing checkmarks, date/transport layouts, aligned mobile actions, and independent full-card/Delete targets. No personal trips were touched. Earlier wizard saving, physical-device acceptance, and final extracted-package checks remain outside this review.


## Wishlist evidence review · 26 October

`tests/wishlist-analysis.js` verifies independent color/aesthetic/occasion evidence, narrowly defined similarity, recorded cardigan/layer pools, mixed-palette neutrality, latest Lab ratings per combination, positive context retained from other combinations, distinct valid recent wear dates, inactive-piece exclusions, and read-only analysis. Wishlist analysis 2.1.1 corrects the evidence without changing ranking or Lab/Sky algorithms. `tests/wishlist-photos.js` also covers keyboard details versus accidental picks, live-record hydration without replacing valid pairs, and the existing fallback when a comparison member becomes unavailable. Existing Pass persistence/failure/Undo and purchase-move tests pass, as does the full JavaScript suite; theme checks pass after the final CSS adjustments.

Bounded synthetic Chrome checks cover 390-pixel Soft Hardware dark, 700-pixel Field Notes light, and 900-pixel Night Bloom dark/text-only layouts. Ranking/Compact/comparison views retain wrapping without horizontal overflow; relevant small controls have 44-pixel targets, and comparison actions clear mobile navigation. Enter and Space open details without a rating; saving changed colors refreshes evidence while keeping the displayed pair. No personal wardrobe data was used. Physical-phone acceptance remains separate.


## Direct import setup/handoff review · 26 October

`tests/test_assistant_import.py` covers authorized-only installation metadata, invalid batch IDs, no installation paths in served app HTML or access tokens in copied requests, missing photo tools, reusable setup evidence and folder changes, wrong-wardrobe rejection in setup/status/preview/apply/retry, preview versus committed receipt, original saved counts after unchanged retry, full-backup compatibility, missing-folder CLI errors, and quoted Unix/PowerShell commands. `tests/setup-flow.js` covers gated setup, separate direct/file contracts, readiness, pending IDs, missing receipts, failed checks, mismatches, retry, saved counts, and existing unsaved-edit refresh guards. `tests/runtime-session.js` covers renewed tokens, fixed destination, read-only status, deadline cancellation, and retry. The full JS suite and all 111 Python tests pass at the checkpoint; focused checks pass after final refinements.

Fresh-context rehearsal: an assistant with no inherited conversation received the actual setup request copied from the synthetic browser UI. It ran the supported check without extra installation hints. After the UI verified that check, it received the actual import request plus two supplied synthetic photos with known ownership and unknown sizes/prices/material/dates. It independently read the schema, prepared the local batch, previewed, applied, and verified two pieces/two photos. An unchanged retry returned already-applied with zero new additions/photos; the original receipt remained two/two. The browser checked that receipt, reopened the pending batch after reload, and loaded the two pieces. No personal wardrobe was used.

Bounded Chrome checks cover 390-pixel Soft Hardware dark, 700-pixel Field Notes light, and 900-pixel Night Bloom dark/text-only layouts, wrapping installation paths/commands, local Claude and ChatGPT/Codex guidance, reused setup, new batch identity, and an injected server-check failure/retry. A fresh context in this agent environment was tested; actual Claude clients, Windows/macOS execution, and physical-phone touch acceptance were not. PowerShell command quoting is unit-tested, not a Windows installation certification.


### 0.3 shared import sources checkpoint (2026-10-26)

- Synthetic staging coverage: authorized upload/read/update/remove, wardrobe identity, filename/path/symlink protections, file types and sizes, immutable-source checks, repeat upload after a lost response, retained photo guidance, and direct import from staged paths with a verified receipt.
- Browser import coverage: stable source IDs resolve only in the selected batch, returned JSON reuses the original, photo-choice failures retain edits, source upload alone creates no piece, and completed batches start fresh. Existing ZIP/JSON and older multi-photo imports remain covered.
- Full JavaScript suite passed; 115 Python tests checked with the configured Python 3.12/Pillow environment. Three socket tests initially blocked by sandbox networking passed when rerun with localhost access (four-test socket suite).
- Visual checks used the actual upload picker with two synthetic photos, reloaded the app to verify retained notes, and inspected 390px, 760px, and 1280px layouts in Field Notes light and Workshop dark. Mobile guidance spans the card width; laptop cards use two columns. No personal wardrobe test entries were added.
- These checks verify handoff construction and importing, not the quality/availability of a provider's image-generation tool. User testing with a fresh local Codex/Claude session and actual photos remains useful before release.


### Direct-import follow-up (2026-10-26)

Focused setup-flow checks cover the host connection label, OS-specific path placeholders, quoted Windows paths, provider-neutral editor access and permission fallback, canceled reloads leaving Done enabled, and pending-save flush failure preventing reload. Seven assistant-import tests check the authorized installation metadata, including the host platform. No algorithm scoring changed.


### Tidy photos main-view follow-up (2026-10-26)

Tidy selection now resolves only the piece's current main photo, including AI recasts, independently of gallery insertion order. Focused tests cover newer alternates, a selected main cutout, a missing legacy main entry, remembered skips, and a main-photo change during review. The latter blocks stale save/skip actions while preserving a retryable review. Tidy dialog, photo gallery, and photo preview/save tests pass. This was checked in code and synthetic handlers; no real wardrobe photos were processed for this fix.


### Bulk import tagging review (2026-10-26)

Full JavaScript unit suite passed. All 25 focused Python tests passed in the configured Python 3.12/Pillow environment: piece import (14), shared sources (4), and assistant setup/receipts (7). Added coverage checks common tagging instructions across five source types and both routes, labeled/scoped vocabulary, supported tags retained by file parsing/record creation, and a committed direct import retaining tags, a recast main photo, its original, and Unreviewed status. Embedded setup and vocabulary synchronization and diff whitespace checks pass. This copy/contract update had no new visual browser pass; a fresh assistant run with the revised prompt and an actual returned file/ZIP remain acceptance checks.


### File-route browser acceptance (26 October / 27 October UTC)

An isolated synthetic installation exercised upload → file request → returned ZIP → review/tag edit → injected first-record write failure → retry → saved results → reload → duplicate update/skip. The request contained tagging guidance and source IDs without private host paths. Two originals were reused from staging; a new recast test fixture became the tee's main photo. The saved records retained the edited occasion tags, aesthetic/season fields, unknown sizes/prices, and mixed owned/wishlist status. Retry reused already uploaded photos; repeating the portable file updated one existing piece, skipped the wishlist match, and added no records/assets. A separate one-piece failure fixture verified the corrected Save paused heading and Finish without adding action. Three final synthetic records and four assets account for both fixtures.

Visual inspection covered 320px Workshop dark, 390px Field Notes light, 760px Field Notes light, and 1280px Workshop dark. Checked loaders, upload guidance, review fields, duplicate comparisons, recovery, footer alignment, and horizontal overflow. Full-width name fields and wider-spaced category fields were rechecked at 390px and 760px. Button targets in mobile review/recovery were at least 44px high. Focused setup/flow, ZIP, import images, matching, and theme tests passed after the fixes; embedded setup synchronization and diff whitespace checks passed. This was browser-width QA with fixture files, not physical-device testing or a new AI-provider/image-generation trial.


### Calendar dialog overflow (26 October / 27 October UTC)

A synthetic installation with short and long saved-outfit names verified the calendar day dialog at 390px and 1280px in Field Notes light. Selecting the long name leaves scrollWidth equal to clientWidth (355/355 and 419/419). The Log it row wraps when needed; no overflow-hiding rule was added. The scheduling chooser also fits at 390px with the long name. Checked the renamed Schedule a saved outfit action and title; no plan/wear writes or personal data. Focused theme, saved-outfit, Trips-navigation, and app-routing tests pass. Wider calendar wear/save/recovery acceptance remains a separate final review item.


### Calendar board handoff · 2026-10-26

`tests/calendar-board.js` exercises full preservation of the previous board, failed pre-switch checkpoints, leaving and resuming dated drafts, one-record outfit/date writes, failed writes and successful retries, response loss followed by draft reload, failed final autosave, and edits arriving during saves. The retry fixture models the runtime's global flush rejection while a failed outfit record is outstanding. Route integration checks blocked menu/Back navigation during Save & schedule.

Synthetic Chrome on an isolated installation at 320/390/760/1280 pixels verified Create from a future day, readable mobile Save & schedule, injected outfit-write failure followed by successful retry and return to that day, original-board recovery, Back without scheduling, and dated-draft restoration after reload. Light Field Notes and dark Workshop show no page overflow; the narrow tray retains its intended local horizontal scrolling. No personal data, physical phone, external weather lookup, or fitness integration was used.

Final validation for this change: the full `npm run test:unit` suite, board/theme source synchronization, and `git diff --check` pass. Synthetic SQLite verification confirms one scheduled outfit/date after the failed-write retry, the later dated draft remains unscheduled, and original board text/layout/background remain intact.


### Continuing imports · 2026-10-27

`tests/test_assistant_import.py` now covers 61 prepared rows across two parts (60 additions plus a cross-part duplicate), immutable retry receipts, request totals/next-part/cursor, needs-input → continuation → complete, sequential part validation, destination mismatch, completed-request rejection of new parts, unchanged retries after completion, zero-result completion, CLI preview/apply/outcome commands, tag retention, and full-backup restore. Source choices persist without uploads, and a saved part alone does not complete a request. Existing piece-import/source tests pass: 29 focused Python tests total.

Setup-flow tests cover blank/explicit/invalid limits, all-source tagging/manual-photo-splitting instructions, partial/zero/complete result states, continuation without a setup loop, and next-file saves retaining staged original references with distinct write identities. The full JavaScript unit suite passed, followed by focused setup rechecks for subsequent UI refinements. Embedded setup sources and git whitespace checks pass.

Synthetic Chrome used an isolated wardrobe with 55 additions in two committed parts and an explicit needs-input outcome. Reopening restored the original store/date scope without uploads; Continue opens the continuation request with tagging and part commands intact. Check import changed to complete while keeping the aggregate totals, and Start another import reused setup with an empty limit. Dialog and body scroll widths matched client widths at 390, 760, and 1280 pixels in Field Notes/Workshop light/dark; mobile footer targets remained at least 44 pixels. A setup-loop issue and buried partial results were fixed during this check. No personal data or real assistant/email scanning was exercised.


### Import preparation choices · 2026-10-27

Setup-flow tests cover both preparation flags across five sources and two routes, all four combinations of record/photo behavior, global/photo-specific inheritance and opt-outs, final chat-declared choices, limits/tagging instructions, separate same-link variants, file fallback notices, and direct receipt fallback summaries. Photo work flags/notes are excluded from saved garment metadata. Request/source tests verify flag persistence without uploads. Python photo tests add a three-color beanie fixture sharing one original, distinct variant matching, idempotent retry, recast-first main selection with original retention, notice metadata isolation, and malformed flag/oversized-note rejection. Full JS plus 31 focused Python tests passed, with focused setup rechecks after UI/copy refinements.

Synthetic Chrome verified 390-pixel selected controls and generated instructions, a three-piece saved direct receipt explaining unavailable editing, reset choices for a new request at 320 pixels, email/file-route options at 320, and no horizontal overflow at 320/390/760/1280 across light/dark Field Notes/Workshop. The supported CLI previewed, applied, retried, and finished the three-beanie fixture: three records, one shared original asset, then zero additional records/photos on retry. Actual AI-generated photo quality and provider-specific approvals require separate acceptance checks; no personal data was changed.

### Existing three-pack beanies · 2026-10-27

An authorized check against three existing variants of a multipack verified duplicate handling and manual photo replacement. Both preparation options appeared in the generated direct request, alongside common tagging and explicit duplicate protection. Three built-in image-editor outputs were visually checked against the original pack photo. The supported import preview/apply matched all three existing variants and added zero pieces; retry returned already-applied. Because duplicate imports preserve existing photos/tags, the individual outputs were added through each existing piece’s Photo options, labeled AI recast, and made main. This verifies the repeat safeguard and the existing-piece editor, rather than claiming the importer updates duplicate photos automatically.

Saved-state checks confirmed the original record IDs, unchanged tags/ownership/price notes, three distinct recast main photos, original pack photo retention, unchanged piece count, and unchanged board. Chrome showed all three individual photos together. Recovery and verification artifacts were kept outside the public source. The run exposed and fixed successful recasts receiving a contradictory missing-photo note, and recognized photo-work fields incorrectly appearing as unknown-field warnings; all 16 piece-import tests pass with regression assertions.

### Mobile file import with both preparation options · 2026-10-27

An isolated local wardrobe exercised the file route in Chrome at 390 pixels: selected both options, uploaded the pack photo, checked that its individual-photo choice inherited the global selection, and verified the generated request included splitting, photo editing, and common tagging. Loaded a real ZIP containing three tagged beanies, three previously generated individual product photos, and the shared original. Review showed three ready pieces, loaded previews, both views per piece, and retained tags. One Add 3 pieces action saved all three without opening piece pages. Saved-state checks confirmed distinct recast main photos, original retention, color/season/occasion/aesthetic/pattern/material tags, and Unreviewed status. At 320 pixels, loading the same ZIP found all three existing pieces; updating them kept exactly three records and their photos. Dialogs had no horizontal overflow; footer controls remained 44 pixels high and wrapped cleanly at 320 pixels.

The actual upload response exposed an inheritance bug: server defaults reset the requested per-photo edit flag. The client now preserves its role, edit choice, and steering text while accepting saved upload metadata, including a lost-response retry. Focused setup-flow tests pass with regression coverage. The Your closet settings group now hides empty save-status space, uses consistent checkbox spacing, and includes the requested fortune-card/laundry wording. Chrome verified the 390-pixel settings group with no overflow.

### Setup spacing and outfit scheduling · 2026-10-27

Focused setup, setup-flow, themes, collections, calendar-board, and outfit-flow checks pass. Added behavioral checks for photo readiness success/unavailability/error/retry and simple scheduling failure/retry, preserved legacy event metadata, no inherited weather/location for new schedules, and the View calendar callback. The existing setup-flow matrix covers source/route variations, optional limits, repeat imports, tags, split packs/product photos, and graceful photo fallback.

A synthetic local store was used for Chrome checks at 390 and 1280 pixels: setup step separation, compact selects, compact closet checkboxes, and the unavailable photo-tools status. At 390, scheduled a synthetic saved outfit for November 4, then used the toast's View calendar action and verified the planned event on that day. No personal wardrobe data was changed. Trips spacing was checked in source only; physical-phone acceptance remains separate.

### Release preparation · 2026-10-27

The full JavaScript suite and all 122 Python tests passed using the supported Python 3.12/Pillow environment. The release spot check then found and fixed wear logging accepting failed piece writes: no outfit success is recorded until all piece saves succeed, duplicate taps share an in-flight operation, and an open-tab retry preserves which dates it added. Removal retains its outfit log when a piece removal fails, allowing retry without removing independently logged dates. Regression coverage also covers an outfit-record failure after piece saves. These are multiple writes, not an atomic cross-record transaction; keep the tab open to recover partial wear saves. Saved-outfit details also remain open when their commit reports failure.

Current source preflight selects 199 allowlisted files, including the Sky share-copy source and referenced board/wishlist documentation. The machine-path scanner permits only the literal placeholder /home/yourname/ used in Linux path guidance; real machine paths remain findings. The lockfile advisory audit reports no vulnerabilities. Exact candidate hashes, extracted-package verification, optional Python advisory results, and secret-scan results belong in the candidate CHECKS.md sidecar. This source note does not certify CI or an unbuilt production archive.


### Release documentation review · 2026-10-27

Re-read the rc.2 README, release notes, installation/update, onboarding, assistant-import, and photo guidance against current behavior. Source corrections cover the old installation folder example, missing laundry summary, user-controlled wishlist order, direct versus file import, optional pack/photo preparation, image-editor limits, and ordinary versus dated/import recovery. Checked relative Markdown links in all 199 selected public-source files: no missing or unpackaged targets. Source preflight and whitespace checks pass. This documentation-only pass does not repeat the already passing full regression suites or replace rc.2; these changes enter the next candidate.

### Approved public garment sizes · 2026-10-27

All eight synthetic public-export tests pass in the supported Pillow environment, including explicit garment-size opt-in, default omission, manifest opt-in consistency, and exclusion of body measurements and personal fit profile. Focused navigation/native-link checks, source preflight, and whitespace checks pass. The first test invocation used the system Python with an outdated Pillow; rerunning in the configured photo environment passed. The development-demo update used an approved source-ID mapping to add recorded sizes while retaining the previously published photos and other records. The stable demo remains unchanged.

### Size-filter cleanup and Add label · 2026-10-27

Missing sizes, non-sized pieces, and one-size pieces now use the same classification for counts and filtering. The old earrings-only No size shortcut is removed; Not applicable follows explicit non-sized records and non-sized categories. Ring/gauge/clothing/shoe missing values are distinguished from recorded sizes, per-piece fits-like sizes, and explicit one-size kinds/aliases. Adjustable/open rings share One size; older specific one-size selections remain matched and normalize into the shared choice during filter rendering. Synthetic regression coverage exercises actual filter results and OR combinations. Focused controls, add-menu, themes, navigation, and app-routing suites pass. Chrome checks at 390 and 1280 pixels verified all three labels/counts, actual mobile result lists, and the Add button in text-only mode. No personal wardrobe changes or button reordering were made.

### Final candidate backup regression · 2026-10-27

Exact rc.3 browser acceptance exposed a backup-validation failure after the daily fortune card persisted its installation identity. The general hexadecimal-string scan mistook that identity for a photo asset. Validation now checks explicit photoId fields, legacy photo-map entries, and catalog bundles, including photo fields in board drafts, while leaving unrelated IDs and text alone. A regression test reproduces the HTTP backup failure and verifies a full restore of daily-card state and all assets; missing piece, care-label, legacy-map, and bundle photos still block restore. All 23 focused core-runtime tests pass. The failed rc.3 archive remains unpublished and is superseded by a fresh candidate; its pre-browser storage roundtrip alone did not expose the issue.

### Corrected final candidate acceptance · 2026-10-27

The extracted 0.3.0-rc.4 package passed the full JavaScript suite and all 125 Python tests, fresh core startup without optional packages, a synthetic published-0.2 update, and full-backup roundtrips. After daily-card state persisted, the actual browser-downloaded backup previewed and restored at 390px, retaining the catalog, complete board, records, and 12 exact photo byte hashes. Square and Story PNG downloads were verified on disk at 1080×1080 and 1080×1920; their bytes match the visually inspected outputs. Chrome checks at 390px and 1280px showed restored photos, outfit history/plans, and fitting dialogs. Source/secret checks and GitHub CI passed on the corrected source. Physical-phone/native-share acceptance remains separate; production packaging changes only version and documentation.

## Batch workspace migration (0.4 candidate)

Repeat imports and Tidy photos use routed pages, retaining the existing direct/file contracts and save operations. Synthetic checks cover Back/Forward and closet-context recovery, untouched boards, save-time navigation guards, file-review reload after partial saves, stable retry IDs and committed-write reconciliation, separate Getting started, ready-cutout recovery, interrupted preparation, photo-source changes, and save/skip retries. The draft helper checks retained Blob bytes and remapped URL caches, wardrobe isolation, write ordering, storage failure/retry, and close-page protection.

Chrome review used an isolated synthetic wardrobe at 390px, 768px, and 1280px across Soft Hardware, Field Notes, and Night Bloom in light and dark. Checked one/two/three-column photo grids, wrapped names and instructions, expanded direct-setup paths, file review, filter targets, and footer clearance. Fixed chooser spacing, 768px navigation overlap, and horizontal overflow from old dialog header margins; the final page scroll widths match client widths. Review filters and relevant action controls have 44px minimum targets. A real three-piece ZIP retained its edited name and photos through navigation/reload; an injected partial-save failure recovered after reload with exactly three additions and distinct photos. Photo review retained its cutouts and selected choice through Back/reload; an injected photo-save failure retried without duplicate uploads, continued to the remaining five photos, and returned normally. Saved-state checks confirm retained color/season/occasion/aesthetic tags, original-photo retention, exactly five total fixture assets, and an unchanged working board. Background removal used a synthetic response; physical-phone touch and actual model processing are separate checks. Screenshots were retained as local review artifacts and are not included in this repository.

### Atomic wear actions

Run `node tests/atomic-wear.js`, `node tests/calendar-board.js`, `node tests/data-history.js`, and `python3 -m unittest discover -s tests -p test_atomic_wear.py -v`. Use synthetic records to verify that adding or removing an outfit wear entry commits all piece dates and outfit history together. Reject a stale final record and simulate a storage failure after writes: neither may leave partial dates. Retry a lost response with the original versions and identical payload; never overwrite a newer edit. Independently logged piece dates and dates shared with other outfits must remain. Check public-demo storage quota failure too. Single-piece logging remains a separate action, and success appears only after saving.

## Trips overview review · 29 October 2026 (Pacific)

The overview now highlights the next plan, previews existing pinned or suggested outfits, counts assigned trip days, and groups upcoming, undated, and past plans. The actions disclosure contains existing edit and delete actions; the trip wizard and stored planning model are unchanged. Wider use of these menus on mobile thumbnails remains a discussion item.

Checked in Chrome with a separate 12-piece test wardrobe at 390px, 768px, and 1366px, including all three themes in light and dark appearances, long names, an outfit suggestion, plans without dates or previews, and expanded action menus. Outside-click and Escape dismissal, event edit/Cancel, event creation and deletion, trip deletion/Undo, dated calendar navigation, and browser Back passed. A stopped local test server produced a failed-save message without removing the event; the same action succeeded after the test server resumed. The working board retained its two pieces.

Focused overview, trip navigation/save recovery, export, Undo, calendar-board, native-link, URL navigation, mobile-helper, theme synchronization, and inline JavaScript syntax checks passed. Two older test fixtures were updated to load current startup dependencies and async print helpers; production export behavior was not changed. This is a local development check, not a release or hosted deployment.

## Trip Fairy steps 2–3 · 29 October 2026 (Pacific)

The Days & bag and Include steps now use dated day choices, night-out and travel-day toggles, calendar-event previews, optional automatic basics, and one Bringing for sure editor. Named setup on these steps uses the existing stable-ID save/retry path automatically; building a named trip saves the resulting plan. New controls use defaults for older trips, including wearing bulky pieces for bags and packing them for a car trunk. Existing dates, names, saved plans, and activity requests remain available.

Focused tests cover dated slots, laundry, events, individual overrides, explicit extras, room estimates, purchase/pull groups in exports, night-out serialization, queued edits during saves, failure/retry, discard, navigation, and Undo. Chrome checks used the separate test wardrobe at 390px, 768px, and 1366px, with all three themes in light and dark appearances. Checked day-menu placement, outside/Escape dismissal, item/outfit/collection pickers, removal, rebuilding, and reopening. The test built five requested outfit slots while retaining eleven explicit pieces, omitted automatic basics when disabled, and kept two wishlist pieces in To buy. Its existing event, wear history, and two-piece board stayed unchanged. Physical-phone checks and deployment are separate.

## Trip Fairy packing page · 29 October 2026 (Pacific)

Page 4 uses day cards with a separate night-out choice, per-slot idea cycling, pin/unpin, bulk pinning, and reshuffling that preserves pinned outfits. Only pinned outfits contribute clothing to the list; explicit additions and enabled basics remain included. Older plans retain the selections that previously contributed to their packing list. The shared trip summary replaces the repeated name/Save card, and packing changes, exclusions, and basic choices autosave through the existing retry path.

The screen and exports use the same categorized snapshot. Added packed counts, list tools, reset/Undo, reversible item exclusions, and basic quantities/selections with thumbnails. Zero basic quantities stay out of exported rows and can be chosen again. Existing swap, board, collection, weather-note, and optional export controls remain accessible.

Focused results, save/retry, legacy/default handling, navigation, export, collection, Undo, and theme checks passed. Chrome checks at 390px, 768px, and 1366px covered all themes in light and dark appearances, suggestion cycling, unchanged pinned photos after reshuffle, pin-the-rest, checkmark reset/Undo, item removal/Undo, quantity changes, export controls, and reopening. The test retained its original event, wear history, and two-piece board. The sample has no eligible underwear photos, so the browser exercised the chooser's missing-item/quantity path; selected basic IDs and exclusions are covered in isolated tests. Physical-phone checks and a new print-dialog/export-device round remain separate. Nothing was deployed.

### Outfit toolbar review — 29 October 2026

The outfit count now sits beside the Outfits tab, and New outfit uses the existing protected board reset and Undo. Search, quick filters, panel-only filter counts, and sorting share a wrapping toolbar; Needs tags is inside Filters. New oldest, wear-count, and name sorts retain the existing sort options.

Focused outfit, board recovery, theme, native-link, and navigation checks passed. Chrome checks used the separate test closet at 390px, 768px, and 1366px, covering all three themes in light and dark appearances, expanded filters, zero results, count/badge updates, and New outfit confirmation, navigation, and Undo. The original two-piece test board was restored. Personal closet data and hosted deployments were untouched.

Trip results follow-up: Planning notes has an inset body, result toolbar actions share a 44px height, and warning confirmations retain contrasting colors across the six theme/appearance combinations. Checked 390px, 768px, and laptop layouts in the isolated test closet, Cancel in the reset confirmation, and pinned changes saving and surviving reload. Trip failures now retain the storage error reason. The local LAN server was restarted against its existing data folder after verifying it was still serving the pre-versioned-write backend; its storage integrity passed. The user's open draft tab was not reloaded or discarded.

## Setup spacing and hosted guidance · 30 October 2026

The optional photo-tools disclosure now has inset padding around its shaded surface. Getting started uses numbered, wrapping step buttons with an accessible current-step marker and the trip wizard’s control sizing. Photo-tool messages refer to the wardrobe service and its hosting computer or server. Assistant-import documentation distinguishes browser ZIP uploads from direct imports over approved SSH, including remote path and source-attachment boundaries. Existing setup-flow, setup, ZIP, and theme checks pass; embedded setup sources and whitespace checks pass. No new visual browser pass or fresh hosted assistant rehearsal was performed for this edit. Oracle’s direct-assistant route still uses local-only instructions and needs a separate hosted handoff review; its downloadable context route remains the portable option.

### Card menus and browse context · 30 October 2026

Shared overflow menus now cover piece, saved-outfit, and collection cards. Focused card-menu, collection, navigation-integration, and theme tests pass, including fresh action values, viewport clamping, single-menu behavior, keyboard dismissal/focus, failed removal/Undo retry, and collection history restoration. The category section is first beneath Filters in both sidebar and phone sheet. All/Closet/site-title navigation clears collection selection; opening a piece and returning retains it.

Chrome checks used only the separate test wardrobe at 390px, 768px, and 1366px. Collection menus were reviewed in all three themes, light and dark. Verified piece Donate/Undo, collection Remove/Undo, collection edit/Cancel, outfit details/Cancel, keyboard End/Escape, and aligned outfit action rows without horizontal overflow. Existing export and outfit recovery tests passed; an actual image download was not repeated in this pass. Hover selectors were inspected, but a dedicated pointer-hover pass and physical-phone acceptance remain pending.

### Recent wears and hosted prompts · 30 October 2026

Recent wears derive from distinct valid past/today wear dates. Tests cover inclusive thirty-day windows, 3/8-day thresholds, DST/leap boundaries, duplicate/invalid/future dates, preservation of legacy values on writes, no wishlist heat, rapid clicks, failed saves, archived/live outfit linkage, and date rollover without repeated same-day redraws. Individual Today toggles retain the existing piece save path; outfit-linked dates open the existing day detail. Saved-view and navigation capture include the heat filter. No recommendation scoring or backup format changed.

Chrome used only the isolated test wardrobe at 390px, 768px, and 1366px. All three themes in light/dark had fitting strips, visible bars, and 44px action targets. Checked 8→7→8 live heat changes, Very hot filtering, retained Unreviewed filter and piece notice, and a newly logged outfit’s Today button opening grouped day details without deleting the piece date. Browse badges replace the former unreviewed question-mark slot. Owner/physical-phone review remains pending.

Oracle’s hosted route now identifies server paths and approved SSH access, retains identity checks and read-only scope, and defaults to file downloads even with a previous setup marker. Import prompts use computer/server wording. Synthetic browser-flow checks cover hosted route selection and copied requests; Python tests cover hosted metadata, scoped files/photos, identity mismatch, access controls, and unchanged wardrobe bytes. Eleven assistant-import and six Oracle backend tests pass. This pass did not deploy to or execute a new assistant request against the live hosted wardrobe.

The JavaScript checks passed after repairing two fixture dependencies on the former card-menu implementation. Daily fortune no longer applies the bright hover/active inset ring; keyboard focus remains visible. Sky’s catalog hint is right aligned beside the perspective tabs and wraps at phone widths.

Piece-card overflow sizing follow-up: the … overlay now matches each theme’s existing heart/board control size (36px Soft Hardware, 34px Field Notes, 30px Night Bloom). Desktop resting controls are hidden; card hover, keyboard focus, and an open menu reveal them. Touch controls remain visible with an expanded invisible hit area. Browser checks confirmed sizes in all three themes, desktop opacity, hover/menu opening, and Escape focus return. Theme and card-menu tests pass.

Eyewear follow-up: Intermediate replaces Computer in current choices/import vocabulary while preserving legacy values, saved-view identity, filter selections, and Lab preferences. Explicit old Sunglasses values normalize to the Sunglasses subcategory; transitions retain their ordinary eyewear classification. Focused category/size/Lab and import-vocabulary checks pass. The broader image-import suite is blocked in the available test environment by the existing Pillow minimum-version check; the focused category/eyewear import test passes. No live personal records were written during the separate canonical category audit.

Wear-strip correction: the visual strip shows ten days, using the same eight-pixel rounded segments and spacing as the existing trip progress bars. Heat still uses thirty days and keeps the two orange levels. Focused wear tests pass.

Setup category selection: the four-step wizard reuses the saved category chooser. Focused setup/category checks cover defaults, protected populated categories, persistence, failure/retry, and Back/Continue navigation. Isolated Chrome checks at 390px, 768px, and 1366px across all three themes in light and dark found no dialog overflow. Category rows retain 44px targets, and a changed choice survived reload. Personal wardrobe data and hosting were not changed.

Metal & finish: optional grouped tags appear for jewelry, watches, and bags, while Tops stays unaffected. Existing material values and unknown saved tags remain editable. The import schema and both assistant prompt routes use the expanded vocabulary without adding universal colors. The complete JavaScript unit suite and all 171 supported-Python tests passed. Isolated Chrome verified save/reopen, clearing the test tags afterward, and 18 layouts (390px, 768px, and 1366px across all three themes in light/dark) without dialog or tag-panel overflow. No personal records were changed.
