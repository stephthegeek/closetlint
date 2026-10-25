# Developer checks and verification limits

Tests use synthetic wardrobes and temporary data folders. Never run destructive checks against a personal wardrobe. Passing tests is evidence for the covered behavior, not proof that the app is defect-free or that every platform works.

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

Keep browser reviews bounded and use synthetic data. This project’s development workflow requires the owner’s approval before browser automation.

## Keeping embedded sources synchronized

The served HTML contains embedded copies of several maintained source files. After editing one, run its sync tool:

- `app/styles/themes.css`: `python3 tools/sync_theme_styles.py`
- `app/scripts/setup.js`: `python3 tools/sync_setup.py`
- Oracle, taste, and shared photo-read modules: `python3 tools/sync_oracle.py`, `python3 tools/sync_taste.py`, and `python3 tools/sync_photo_fetch.py`.
- Collections and navigation modules: use the corresponding `tools/sync_*.py` helper.
- Import categories and tag vocabulary: `node tools/sync_import_vocab.js`

The existing tests check relevant synchronization and source invariants.

## 0.2 verification

The ZIP implementation review used commit `1a637c9216f6ffd709196a5a3e972ea6884a207c`. Sky and the daily fortune are excluded from 0.2. Later preparation includes board autosave recovery, consistent Save/New/Copy behavior, navigation, and HTTP connection handling; the final package must include and verify those changes. The current source JavaScript suite, all 94 Python tests, and 18 core tests without site packages pass on Linux. Exact-commit CI and final device acceptance must correspond to the final implementation, rather than relying on the earlier candidate alone. A prepared package is not a published release.

The 25 October review refinements add consistent piece-header toggles, white default board backgrounds, grouped outfit/design actions, layout-change confirmations and recovery, bounded My Taste summaries, Lab variety, and saved-outfit toolbar refinements. The full release JavaScript suite and all 94 synthetic Python tests pass after this batch. The proposed separate outfit-preview page and persistent draft switching are deferred until after 0.2; opening a different outfit still uses the existing unsaved-work confirmation. Final physical-device and cross-theme acceptance remains pending.

A photo-transfer stall remains unresolved on one physical phone-to-laptop Wi-Fi path. Both earlier and current Python servers and an independent Node server reproduced it with identical synthetic images. Live TCP counters showed packet retries and multi-second backoff while app processing took milliseconds. Smaller packets, disabling laptop Wi-Fi power saving, and bypassing image lazy loading did not eliminate it. These observations do not identify the exact network or system cause, and no photo-stall fix is claimed. The owner deferred that investigation on 24 October 2026.

Completed on Linux:

- Full JavaScript suites and all 91 synthetic Python tests passed against the source and extracted rc4 package. [Exact implementation CI](https://github.com/stephthegeek/closetlint/actions/runs/40119855640) and a [second run](https://github.com/stephthegeek/closetlint/actions/runs/40119860160) passed security/source, dependency-advisory, full-history secret, and minimum-Python checks.
- The extracted package started a real local server without optional packages; core startup also passed with `python -S`. Optional photo tests used the existing supported photo environment without installing packages.
- Chrome loaded, reviewed, and saved a real synthetic ZIP: one new wishlist piece, one existing owned update, original existing photo preserved, and no duplicate insertion for that update. Native copy/paste of the complete request passed on the home-network HTTP address.
- Chrome exported and restored the synthetic full backup after the owner accepted its download. All collections, the working board, and 13 photo hashes matched afterward; a local recovery copy was created.
- Automated import/Oracle tests cover missing photos, failed and stalled downloads, partial saves, retained uploads, retry without duplicate records, stale file reads, and cancellation. ZIP adversarial checks and their limits are recorded in [the security review](SECURITY-REVIEW.md).
- All 152 rc4 manifest entries matched. Rebuilding the committed implementation produced the identical rc4 ZIP. Embedded wardrobe data was empty, with no personal photos, databases, private config, models, environments, Sky modules, or daily-fortune modules.
- Both desktop piece-editor X and Cancel worked in the synthetic browser check. The reported intermittent physical-phone freeze was not reproduced or certified by that check.

Earlier 0.2 checkpoints exercised actual command-import preview/apply/retry, duplicate skips, wishlist promotion, JSON-file/pasted imports, no-new-items completion, photo failure recovery, and an update of a synthetic wardrobe created with published 0.1. Those are historical checks of those workflows, not claims that every earlier artifact matches the final package.

Physical-phone performance, every theme/device combination, Windows/macOS installation, and broad assistive-technology coverage are not certified by these tests. Final owner acceptance, exact final-commit CI, and the final package hash are recorded with the release evidence. No automatic deletion expiry or trash purge is implemented.

## 0.1 verification

The release branch excludes Sky. The development build and dev site retain it; checks of those builds do not establish that Sky is part of 0.1.

Completed for 0.1:

- GitHub Actions passed the full JavaScript suite, 53 Python tests, dependency advisory checks, public-source checks, and full-history Gitleaks scanning. Actions are pinned to commit revisions.
- A separate Python 3.10 CI job passed core runtime tests and sample initialization, startup preparation, and backup export without optional packages. The full suite also runs on Python 3.12.
- On Linux with Python 3.14, a freshly extracted ZIP started a listening server without site packages. Its manifest matched its files, and its source contained no embedded wardrobe or Sky modules.
- A browser downloaded a full sample backup containing 12 photos, a saved outfit, and a working board. Cancelling restore preserved a sample edit. Confirming restore reproduced the backed-up catalog, collections, and board exactly; the automatic recovery snapshot retained the replaced edit. Updated extracted source reopened the same data successfully. This checks source replacement, not a general future-version migration or downgrade guarantee.
- Browse-title padding and theme typography were checked at 390 × 844 and 1300 × 900 across all three themes in light and dark. Lab accessory labels, shoe preservation while accessorizing, and positive-first My Taste ordering were checked with synthetic data.
- A read-only performance pass used an existing 1,100-piece wardrobe at 390 × 844 in desktop Chrome. Search, category filtering, scrolling, and board-tray search responded without a visible stall. Browse mounted 60 cards plus its loading sentinel rather than the whole wardrobe. This was a bounded observation, not a hardware benchmark or physical-phone test; long board-tray and Lab lists remain future optimization work.
- The optional photo worker uses direct U²-Net/ONNX inference and Pillow 13 or newer. A synthetic setup rehearsal and inference check passed previously, and the mask matched the former implementation without changing RGB pixels. The latest dependency advisory checks passed; a fresh optional-tool installation was not repeated during the final recovery pass.

The source/security and minimum-Python jobs passed again after the final layout changes: [CI run](https://github.com/stephthegeek/closetlint/actions/runs/39696412455). Final packaging and release metadata receive the same CI checks before merging.

StephTheGeek completed the physical-mobile review and approved the 0.1 release on 21 October 2026. A Pixel Fold tester reported improved behavior after the wider touch-layout changes. Those touch breakpoints and keyboard handling also have synthetic regression coverage; a resized desktop browser alone does not emulate a physical foldable. Windows and macOS installation, broad assistive-technology coverage, and an independent human security audit remain unverified.

See [the security review](SECURITY-REVIEW.md) for security boundaries and residual risks.

### Oracle page and final mobile consistency checks

- Open Ask the Oracle from the menu, a collection, and selected pieces. It uses `#/oracle`, with the app header and navigation available. Refreshing the direct URL opens the Oracle.
- Type a question and choose details; navigate to Closet or Board, then return or use browser Back/Forward. The question and selections remain in memory. Done finishes the handoff and clears the in-memory draft. A full reload does not persist question content; an unfinished question prompts before reload.
- Complete both assistant routes, copy edited prompt text, download context, and cancel photo preparation by returning to Closet. A non-cancellable context download blocks navigation until it finishes.
- Verify page scrolling, keyboard access, and action spacing on mobile. Other dialogs retain centered mobile margins.
- Browse owned, hidden, stashed, donation, wishlist, category, and searched views: the toolbar shows only the matching count, such as `4 pieces` or `1 piece`, with no status prefix or unfiltered total.

### ZIP import and add-menu checks

Automated checks cover stored/deflated ZIPs, relative photo paths, gallery order, missing photos, CRC corruption, duplicate/unsafe/ambiguous names, encryption, image types, compressed/unpacked limits, resource cleanup, no writes before review, and the existing photo save/retry path. `tests/setup-zip.js` uses synthetic PNGs only.

Owner mobile check: choose **+ → Bulk import pieces**, copy a fresh request, ask the assistant for one ZIP, load it, inspect the matched photos, and save a small batch. Try a missing-photo batch to confirm explicit recovery choices. The plus menu must show only Add piece and Bulk import pieces, with no emojis; outside click, Escape, arrow keys, and switching to the hamburger menu should close it appropriately. Utilities should show Setup wizard, Tidy photos, Export backup, and Restore full backup in that order where available. No automatic bulk-photo matching is promised for a loose JSON plus loose image files.

Release checkpoint: all JavaScript unit checks passed after ZIP/menu implementation; all 88 Python tests passed with the existing supported Pillow photo environment. A system-Python run with outdated Pillow failed the photo-dependent tests; use the supported environment for the photo suite. Fresh package, CI, and extracted-package checks are still required after the local mobile changes are committed.

### Continuing thumbnail warmup

New synthetic checks confirm that `/api/assets` queues new photos before a thumbnail request, images added after worker startup are discovered without browsing, queueing does not read or change originals, and restores trigger a new scan. Existing cold-preview bounds, request priority, codec fallback, alpha preservation, and original-byte checks pass. Browse assigns eager/high priority to its first six images and keeps later images lazy. Run thumbnail tests in the supported photo environment.

Owner check requires a server restart for the Python worker changes, followed by a page refresh. Compare a newly visited category and a newly imported/cutout photo on mobile. Fast server samples do not establish phone end-to-end latency: the home-network server's sampled cached previews responded in roughly 1–10 ms, so browser/network timing may still need attention if long blank states persist.

## Internal algorithm versions

Algorithm versions are independent of the app release and storage schema. Update the relevant version and behavioral regression tests whenever scoring or selection changes.

- **Lab selection 2.0.0:** earlier selection was unversioned. Learned taste now uses transferable patterns rather than direct piece-ID rewards, with a reduced preference weight. The eight most recent distinct rated/skipped outfits contribute a soft piece-reuse penalty. Candidate signatures are deduplicated, and 20% of selection weight explores compatible outfits without taste weighting. Explicit anchors are exempt from the reuse penalty; minimum compatibility, blocked pairs, and already-rated/seen combinations remain enforced. Newly generated candidates and ratings made from them carry `algorithmVersion`; older/manual outfits remain unversioned rather than being relabeled.
- **My Taste summary 2.0.0:** earlier summaries were unversioned. Shows up to three positive observations, two passed-on patterns, and three repeat-loved pieces; ranks supported patterns ahead of tiny perfect samples and combines observations backed by the same outfits. Individual outfit examples remain paginated.
