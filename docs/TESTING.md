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

Feature scope was frozen on 23 October 2026. The tested release candidate excludes Sky and the daily fortune. Owner final mobile and cross-theme acceptance is still in progress; the release has not been published.

Completed against code commit `44b93fe` and the extracted `0.2.0-rc.1` package:

- Full JavaScript checks and all 62 synthetic Python tests passed. Exact-commit [GitHub CI](https://github.com/stephthegeek/closetlint/actions/runs/40036678557) passed source/security, dependency audits, full-history Gitleaks, and minimum-Python checks.
- Both import routes ran against a separate synthetic local installation. The direct route used a real CLI preview, save, unchanged-batch retry, duplicate skip, wishlist promotion, and browser refresh. The file route exercised pasted text, actual JSON-file input, match review, preserved photos/tags on promotion, explicit missing/failed-photo recovery, and no-new-items completion.
- Automated real-handler tests covered partial saves, retained uploaded views, retry without duplicate records, stalled response headers/bodies, Oracle close/abort, invalid files, and stale reads. Stalls were simulated in tests, not induced in the live browser.
- The extracted package started a listening server with `python3 -S`, without optional packages. The read-only setup check explained unavailable photo tools, and an existing shared photo environment was detected and used by the importer without installing packages.
- A synthetic wardrobe created with published 0.1 opened in the extracted candidate with its catalog, collections, board, and photos unchanged. This checks the 0.1-to-0.2 update, not general future downgrade compatibility.
- Live HTTP checks covered complete backup export, preview/cancel without replacement, required confirmation, restore, a recovery database retaining a replaced record, and fresh restore with matching photo hashes. Chrome exported a verified complete synthetic backup and completed preview and confirmed restore.
- All candidate manifest hashes matched. Embedded wardrobe data was empty, and no personal wardrobe photos, databases, private configuration, Sky modules, or daily-fortune modules were included.

These checks were performed on Linux. They do not certify Windows/macOS installation, physical-phone performance, every theme/device combination, or assistive-technology coverage. Final wording, metadata, and artifact changes require their own source/package checks before publication.

### Post-freeze owner-review fixes

The latest local verification includes individual catalog-photo serving, optional WebP previews and alpha preservation, queued request bursts, authenticated city/seasonal-weather lookup and manual recovery, Oracle Trips opt-in and mobile controls, Wishlist Pass and its backup/restore/Undo behavior, selected emoji packs, and the mobile toolbar/color-picker changes. The full JavaScript suite and all 86 Python tests passed on Linux; the optional photo tests used the existing Pillow 13 environment. Public-source boundaries, embedded modules, whitespace, and the JavaScript dependency audit passed. The final mobile branding CSS change subsequently passed the focused theme checks.

The owner confirmed that photo loading improved after restarting the updated backend. Other visual acceptance remains in progress on the owner’s phone. The latest candidate, exact commit, package manifest, and extracted-package results are recorded separately during final packaging; earlier rc.1/rc.2 evidence above does not certify a later artifact. Sky and the daily fortune remain excluded from the release branch. No automatic deletion expiry or trash purge is implemented.

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
