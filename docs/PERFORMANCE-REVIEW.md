# Performance and structure review · October 2026

This is a historical engineering review, not an installation guide or a current release checklist. Measurements and pass/fail statements describe the dated review work. See [release planning](NEXT-RELEASE.md) for current scope and [testing](TESTING.md) for repeatable checks.

The implementation review and final synthetic checkpoint are complete. Startup routing, saved-outfit rendering, warm thumbnail lookups, board ownership, autosave, save recovery, and conservative CSS cleanup are addressed. This does not certify physical-phone performance or resolve the separately deferred network stalls. Historical measurements below are labeled by pass; the final checkpoint summarizes that review.

## Implemented

- Hide page bodies until capability and initial wardrobe snapshots are ready. Show a loading status, and show a refresh instruction if an initial snapshot fails.
- Resolve the requested URL before rendering a remembered/default page. Queue navigation made while loading.
- Avoid a second render immediately after the route renders its initial destination.
- Remove the duplicate saved-outfit redraw on subsequent data updates.
- Retain Sky landing/alias routing in the development source. No algorithm or storage behavior changed, so algorithm versions are unchanged.

The changes are isolated against v0.2.0 in the performance-review worktree and synced into the active development source. Published 0.2 and the stable demo are unchanged.

## Browser evidence

Tests used separate synthetic installations in Chrome, with a deliberate 1.2-second delay on the initial state request. Desktop viewport was 1,704 pixels wide. Phone-width checks used a 390-pixel iframe viewport in desktop Chrome; this is a responsive-layout check, not physical-phone or touch emulation. Test instrumentation and framing changes exist only in the output harness, not application sources.

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

## Disposition at the review checkpoint

- **Completed:** URL-first startup; saved-outfit metadata caching and bounded rendering; warm thumbnail lookup index and restore invalidation; board module/document boundaries; render/autosave separation; explicit save status/retry state; conservative theme CSS cleanup; final synthetic browser and regression checkpoint.
- **Release preparation at the time:** Sky integration, release scope, documentation, extracted-package recovery, and physical-phone review were still pending. Version 0.3.0 has since been published; these are historical gates, not the current release checklist.
- **Deferred maintenance:** broader shared application state, cross-selector CSS restructuring, cold thumbnail-worker startup, warmup scanning/cache growth, and other large-list rendering (board-tray batching is completed below). None is being silently folded into the Sky release.
- **Measurement follow-up:** retain the synthetic benchmark and compare repeated runs on the same machine. Current measurements are a baseline, not CI-enforced latency or memory budgets. Full browser-paint timing and retained-heap/leak analysis still need dedicated tooling.
- **Separately deferred:** mobile transport stalls and the outfit-preview/draft-switching redesign.

Existing bounded closet batches, thumbnail/lazy loading, saved-outfit batches, and bounded Lab generation remain. No framework or scoring rewrite was introduced.

## Growth since 0.1

App/runtime source, excluding duplicate embedded modules, grew from 906,578 to 1,098,750 bytes (21.2%). Delivered HTML grew from 830,712 to 998,378 bytes (20.2%). Runtime source grew 32.9%, and tests grew 130.2% by bytes. These are source-size comparisons between published releases, not evidence of a corresponding slowdown.

## Validation

- Full JavaScript unit suites pass in the isolated release-baseline tree and active development tree, including Sky and daily-card suites in development.
- Navigation integration tests cover startup gating, queued navigation, partial snapshots, no-database fallback, visible initial-load errors, initial/subsequent single outfit draws, direct links, guards, and history behavior.
- Embedded navigation synchronization and whitespace checks pass.
- The development Wishlist Pass VM fixture now supplies its existing browser scroll dependency; this is test-fixture support, not a ranking algorithm change.
- Browser checks cover direct Oracle, outfits, board, Sky, and missing-collection recovery, with responsive checks as described above. No new physical-phone check was performed, and no server/storage mutation behavior was changed.

Sky is targeted for the next release. Its release integration, performance, behavior notes, algorithm versions, and scope still need a dedicated release checkpoint.


## Follow-up implementation · saved outfits and thumbnail lookup

Completed the next optimization batch in development and the isolated review branch:

- Reused one active-piece map for all rating lookups, preserving exact, legacy role-only, and stored-outfit rating precedence.
- Cached derived outfit metadata against the values of outfits, edits, custom pieces, profile/fit settings, ratings, and photo-load progress. Value checks cover in-place updates and Undo, rather than relying on object identity.
- Mounted saved-outfit cards in batches of 40, with automatic loading near the viewport and an accessible Load more outfits button. Filtering still searches the full library. Search remains immediate, and the search input retains focus.
- Added an in-memory warm-preview index populated by the thumbnail worker. Indexed requests read the preview directly without reading or hashing its original. Restore clears the index and changes its generation, preventing a pre-restore worker from publishing stale entries. Cache corruption, missing previews, cold requests, original fallback, ETags, and same-origin controls remain covered.
- In development, moved the mobile Sky sharing control to a compact Share button in the map’s top-right corner. The desktop header control and existing share dialog remain. No scoring/selection changes or algorithm version bumps were needed.

With the same 1,000-piece, 250-outfit synthetic browser fixture, the initial redraw took 32.2 ms and mounted 40 cards. Five warm searches took 12.7, 13.8, 10.8, 14.8, and 8.8 ms (median 12.7 ms), versus the earlier 420.2 ms sample. These are synchronous redraw measurements in desktop Chrome; subsequent image decode, layout, and painting are outside the measured function. The comparison is diagnostic, not a physical-phone benchmark.

A separate 20-run warm cache lookup benchmark used a real, synthetic 2,048 × 2,048 noise PNG (12,598,429 bytes) and its generated 157,294-byte preview. Median read/hash/lookup fell from 9.352 ms to 0.027 ms on the indexed path. This excludes network time and cold generation. It does not resolve the separately deferred mobile transport stalls. Worker process startup and warmup scanning remain further profiling opportunities.

Validation: both complete JavaScript suites passed. In the existing supported photo Python environment, the full Python suites passed (96 baseline-tree tests and 100 development-tree tests); subsequently added legacy indexed-route coverage passed in both focused catalog-photo suites. The system Python run encountered its older unsupported Pillow version; no dependency or safety floor was changed. Focused tests cover cached metadata invalidation, full-library search, bounded card mounting, load-more behavior, rating precedence, zero original reads for warm uploaded/catalog thumbnails, corruption, restore invalidation, and stale-worker rejection. Browser checks confirmed search performance and mobile Share placement and dialog behavior at a 390-pixel iframe viewport. Physical-phone behavior still needs verification.

The diagnostic harness and raw measurements were retained as local development artifacts and are not included in this repository. That pass was followed by the board, autosave, save-state, CSS, and final checkpoint work below; it did not publish a release or update the stable demo.


## Board/editor and CSS boundary pass

The board session, editor/pointers, collage, design/export, and base CSS now have focused editable sources with deterministic embedding. Whole-board replacement uses one transition helper, document snapshots detach mutable data, and late gestures are bound to their originating board and pointer. Scoped CSS cleanup preserves final declaration values and media conditions. See [BOARD-EDITOR.md](BOARD-EDITOR.md) for ownership, checks, remaining shared-state coupling, and visual-review limits. No framework, storage format, algorithm, or protected outfit-opening workflow was changed.


## Board paint/autosave separation (2026-10-25)

Removed draft autosave and document normalization from board rendering. Added explicit commits at every audited mutation and Undo boundary, including New/Open, Lab handoff, closet removal, design/layout, arrangement, text, and pointer completion. Pointer selection no longer writes; cancelled/lost-capture motion retains its final position, while cancelled cutouts do not apply. Existing runtime debounce, serialized storage, retry, and backup-flush behavior is retained.

Added synthetic action-level persistence coverage that cannot rely on render side effects. Updated navigation/workspace fixtures to reflect the same boundary. See `BOARD-EDITOR.md` for the mutation audit and remaining shared-state/save-state review. No scoring algorithm, schema, framework, published package, or demo change.

Validation for this pass: both full JavaScript suites passed, and the supported-Python suites passed (97 baseline-tree tests and 101 development-tree tests). Embedded-source checks and `git diff --check` passed.


## Shared save status and recovery (2026-10-25)

Added persistent draft/outfit status and manual retries, explicit outfit-operation state, stable retry IDs (including copies), and per-board failure recovery through New/Undo. Retries snapshot the latest edits; older acknowledgements cannot mark newer draft edits saved. Runtime record failures clear only when that same record succeeds. Existing automatic retry/flush/unload protections remain. See `BOARD-EDITOR.md` for the state contract, tests, and open-tab limitation. Both complete JS suites and supported-Python suites pass (97 baseline, 101 development). No new interactive visual check, schema, algorithm, or published demo/package change.


## Theme CSS cleanup (2026-10-25)

Removed 69 superseded declarations from the shared theme stylesheet, removed empty rules, and joined adjacent mobile browse-control blocks. Each removed declaration has a later replacement with the exact same selector, media conditions, property, and importance. Retained rule order, specificity, theme variables, breakpoint conditions, and modern-value fallbacks. This covers header sizing, card controls, category tabs, collection previews, photo tools, and mobile text-only controls without redesigning them. Both development and review sources use the same cleaned stylesheet; embedded HTML is synchronized.

This is maintenance cleanup, not a claimed rendering-speed improvement. Keep skin and appearance independent, preserve coarse-pointer tablet breakpoints, and avoid moving responsive or text-only overrides ahead of their base rules. Further cross-selector consolidation needs visual comparison, rather than assuming that similar declarations are interchangeable.

Validation: final declaration maps match the pre-cleanup sources for every selector and media context. Both complete JavaScript suites passed, including theme, mobile UI, board, and control-mode checks. No new interactive browser or physical-phone visual check was performed; existing tests do not establish pixel equivalence. No algorithm, storage, package, or demo change.


## Final checkpoint (2026-10-25)

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

The visual pass found two mobile sizing issues: retry labels inherited icon-only toolbar widths, and Fantasy mode’s text-only width was overridden by a later icon rule. Both are corrected without changing theme colors or breakpoints. Browser viewport checks are not physical-phone touch verification.

The complete development JavaScript suite and all 101 supported-Python tests passed. After the CSS fixes, focused save-state, theme, mobile UI, control-emoji, and embedded-source checks passed. Additional browser probes and failure-injection fixtures were local review artifacts, not shipped sources. No personal wardrobe was changed. Published 0.2 and the stable demo remain unchanged.


## Board picker and large-list audit (2026-10-26)

Board thumbnails now mount in batches of 60, with automatic loading when the end comes into view and a keyboard-accessible Load more pieces fallback. Category, favorite, Sky, and text filters still search the full owned-piece list in the same order. Filtering resets the mounted batch and mobile picker scroll. Replaced/disconnected grids reject late observer callbacks. This bounds initial DOM creation; it is progressive loading, not virtualization, so scrolling through every piece can still mount the entire result.

Validation: full JavaScript suite passes, including a 1,000-piece synthetic tray fixture for complete filtering, manual fallback, correct card actions, and stale observer rejection. Synthetic Chrome checked phone-width automatic loading (60 to 120), search for a piece outside the initial batch, filter reset, and initial desktop batching. No personal wardrobe changed; physical-phone acceptance remains pending.

Further large-list review candidates, not changed by this pass:

- Wishlist ranking mounts all matching rows and calculates per-piece analysis. Preserve global ranks, tier dividers, jump links, and drag-to-reorder when improving it.
- Sky detail contributor lists are now deferred and batched; see the follow-up below.
- Collection overview and collection chooser mount every collection (up to four preview images each). The collection piece editor already limits its picker to 80 per step; collection browsing uses the bounded closet grid.
- Trips overview mounts all saved plans, including past trips. These cards are relatively light; archive/group paging may be useful for a long history.

The main closet and saved-outfit cards already have bounded initial batches. No new ranking algorithm or storage format changed.


## Sky contributor lists and page/dialog follow-up (2026-10-26)

Sky detail panels now build only the three preview cards initially. Expanding See all pieces builds 24 more cards at a time; scrolling loads another batch, with Load more pieces as the keyboard/manual fallback. Collapse pauses loading, reopening preserves the mounted cards, and closing/replacing details invalidates old callbacks. Previously mounted cards remain; this is progressive rendering, not virtualization. Scoring inputs, formula version 2.0.0, and contributor order remain unchanged.

The bounded visual review covered Sky detail, board tools, saved-outfit list/preview, collection actions/editor, Sizes & fit, Getting started, and the Trips overview. Synthetic Chrome used 390/502-pixel iframe phone layouts and a laptop viewport. Mobile Sky expanded from 3 to 27 to 51 cards with no panel overflow; long synthetic piece names wrap. Collection actions remain on one line at 502 pixels. Setup Close, collection actions, and outfit-preview actions have at least 44-pixel targets. The outfit preview return link now precedes the title instead of sitting below the image. These checks do not establish exhaustive theme equivalence or physical-phone gestures.

Board selected-piece tools now link to the existing background-removal review for both freehand pieces and collage windows. Accepting makes the separate cutout the main piece photo globally; originals remain in the piece gallery. Preview/discard does not save a photo or board, unavailable local tools report setup guidance, and stale selection/capability callbacks cannot open the wrong piece. The synthetic browser verified the unavailable-service path; successful processing/acceptance and original retention are exercised by the photo-review and board-photo-tools regressions.

Sky detail text links, piece cards, buttons, and disclosures now include theme-aware hover/pressed feedback and visible keyboard focus. Browser checks verified actual mouse hover for links/cards, keyboard focus, and dark-theme accent feedback. New custom interactive controls must include these states; the rule is documented in THEMES.md.
