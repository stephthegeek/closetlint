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
- The fictional 12-piece sample’s taxonomy, photos, export/restore, and refusal to replace a nonempty wardrobe.

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
- Collections and navigation modules: use the corresponding `tools/sync_*.py` helper.
- Import categories and tag vocabulary: `node tools/sync_import_vocab.js`

The existing tests check relevant synchronization and source invariants.

## Release evidence and outstanding checks

On 2026-10-20, a clean extraction of the committed source passed the full JavaScript suite and 47 Python tests, including the static demo exporter. The public-source boundary check found an empty embedded wardrobe and no built-in secret or machine-path pattern matches. A separate static 12-piece synthetic demo was loaded on SiteGround, with its photos visible.

These checks are not a fresh-machine installation certification. Windows and macOS installation, fresh optional-tool setup, and final browser/device checks remain open. A new listening-server check could not run in the restricted shell used for this checkpoint because socket creation was denied; existing HTTP-handler tests and the earlier hosted demo check cover different parts of that path. Do not describe the current tree as a verified 0.1 release.

CI is configured for synthetic tests, dependency audits, public-source checks, and full-history secret scanning. Verify the result of the release-prep push in GitHub Actions before tagging a release. See [SECURITY-REVIEW.md](SECURITY-REVIEW.md) for the dated security findings, tooling evidence, and limits.

On 2026-10-20, the optional photo worker was changed to direct U²-Net/ONNX inference so both photo environments can use Pillow 13. A clean source snapshot passed the full JavaScript suite, 49 Python tests, and the public-source check. `pip-audit` reported no known advisories for the combined optional requirements. The new mask matched the previous Rembg mask pixel for pixel on a synthetic garment photo, and its RGB pixels were unchanged. A synthetic installer rehearsal and a synthetic-photo run through Stephanie’s updated local optional environment succeeded. No browser or other operating system was checked for this change.
