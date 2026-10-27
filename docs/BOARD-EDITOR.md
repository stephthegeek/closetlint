# Board/editor source and state boundaries

The board uses plain JavaScript and the existing portable app closure. Editable modules are embedded into `app/closet-lint.html`; they are not separately fetched at startup. This is a maintainability and state-safety change, not a framework migration or a bundle-size optimization.

## Source ownership

| Source | Responsibility |
| --- | --- |
| `app/scripts/board-session.js` | Whole-board transitions, independent document copies, draft persistence/recovery, saved-outfit identity, and Save/Save a copy |
| `app/scripts/board-editor.js` | Board/tray rendering, selection controls, pointer gestures, cutout interaction, and toolbar wiring |
| `app/scripts/board-collage.js` | Collage geometry, slots, replacement/swap interaction, and layout recovery |
| `app/scripts/board-design.js` | Board appearance, text, palette strip, arrangement, decoration, and image export |
| `app/styles/board.css` | Base workspace, piece, collage, style-control, palette, and decoration CSS |
| `app/styles/themes.css` | Skin-specific and cross-component overrides, including mobile toolbar presentation |

Run `python3 tools/sync_board.py` after changing board modules or base CSS, and run `python3 tools/sync_theme_styles.py` after changing theme CSS. The normal JavaScript test suite checks board synchronization; theme tests check their embedded source. Embedded block positions retain the original load and cascade order.

## State contract

`state.board` is the sole active, mutable editor document. `state.outfits` contains saved records, and the runtime's recovered/persisted board is a storage snapshot. These objects must not share mutable piece, cutout, text, or style arrays.

- `adoptBoard` is the single whole-board assignment path. New, Open, recovery, Lab handoff, and whole-board Undo use it. It refuses replacement during a pending outfit save and resets piece/text/palette/slot selection, cutout mode, collage replacement/swap state, and active arrangement/design recovery controls. It updates the existing router's linked-outfit compatibility flags and the title field.
- `copyBoardPieces` copies supported placement fields, including independent cutout points. `boardDocument` adds detached metadata for draft storage and recovery.
- `mapPiecesForDoc` creates a detached, rounded placement snapshot for saved outfits. Save retains the captured board identity, existing saved-record wear/planning information, and the protection for names typed during an asynchronous write.
- Opening a saved outfit creates a separate editor copy. Save updates that outfit; Save a copy creates another saved identity. New and its Undo retain the existing confirmation and recovery flow.
- Ordinary gestures mutate only their captured active document. Piece, cutout, palette, text, and collage callbacks check board and pointer identity before acting. A delayed collage long-press cannot create an overlay after another board is adopted, and stale pointer completion cannot persist the replacement board.
- Design and deletion Undo keep their existing board-reference guards. Saved records are written through the existing storage adapter, not by editor rendering.

## CSS cleanup and scope

Base board styles now have one editable component source with sections for layout, collage, style controls, decoration, and accessory suggestions. A redundant overridden declaration was removed, and adjacent identical mobile media blocks were merged without moving their rules. Final selector/property values and media conditions were compared with the pre-change sources and remain identical. Skin-specific overrides are retained deliberately; flattening that larger cascade requires its own design review.

## Validation

Both full JavaScript suites pass, including session, board workspace, navigation, outfit, theme, Sky, and daily-card coverage where present. Both full Python suites pass in the supported photo environment (97 baseline-tree tests and 101 development-tree tests). Focused session tests use the actual source module and cover detached copies, saved-record isolation, transient reset, pending-save replacement guards, owning-pointer edits, stale events, delayed collage callbacks, and listener cleanup.

A separate synthetic Chrome installation was used to save, update the same outfit, start New, Undo New, and reload the linked board. The 390-pixel iframe viewport retained its white board background, pieces, title, and controls. This is a responsive desktop-browser check, not physical-phone touch verification. No personal wardrobe was edited. CSS-only final cleanup was additionally checked by declaration comparison and the existing theme suites.

## Follow-up review

- The app still shares its closure-level `state` object. These modules make ownership visible but do not introduce a new application-wide state store.
- Rendering and draft commits are now separate (see the explicit autosave audit below). Keep new edit/Undo paths covered by action-level persistence tests; never reintroduce saving into a painter.
- Explicit outfit save operations and runtime draft status now drive save feedback (see Save status and recovery below). The navigation compatibility flag remains; wider application state is still shared.
- Saved outfit links now open a preview. Edit switches through the persistent workspace checkpoint described below.
- Conservative CSS consolidation and the combined synthetic theme/save-state checkpoint are complete; see `PERFORMANCE-REVIEW.md`. Deeper cross-selector restructuring, physical-phone gestures, and enforced performance budgets remain follow-ups.

No Lab, My Taste, or Sky scoring/selection algorithm changed, so their versions are unchanged. Published 0.2 and the stable demo are unchanged.

## Explicit draft autosave (2026-10-25)

`renderBoard()` now paints without saving or mutating the board document. Collage window counts and the legacy zig/wave frame alias are calculated for display. Navigation, selection, photo-color refreshes, and draft recovery do not schedule a draft write.

Edit handlers call `persistBoard()` before repainting. It captures a detached document and delegates the existing 200 ms debounce, serialized writes, retries, unload protection, and backup flush to the runtime. An optional captured-board argument rejects stale async/gesture owners. This does not change the distinction between draft autosave and the explicit Save outfit / Save changes action.

| Mutation boundary | Persistence coverage |
| --- | --- |
| Pieces | Add/remove from closet, tray, collections, or Lab; flips, frame toggle, stacking order, straightening, and cutouts |
| Design | Style changes, collage conversion/layout/windows/gutter, crop/zoom, replacement/swap, and arrangement |
| Text and palette | Add/remove text, content, font, alignment, color, effects, and positioning |
| Gestures | Move/resize/rotate, collage pan, and completed cutout; unchanged clicks do not save |
| Session and metadata | Name, suggested title, favorite/details, Open, New, saved identity after Save/Save a copy, and Lab handoff |
| Undo | Piece/text deletion (toolbar, toast, and keyboard), design, layout/crop/cutout, arrangement, title, New, and Lab handoff |

Gesture completion saves the final visible position on pointer-up, cancellation, or lost pointer capture, once. A cancelled/lost-capture cutout leaves the shape unchanged. Callbacks cannot write after their board or edited object has been replaced.

`tests/board-autosave.js` exercises real action handlers with saving disabled in the render stub, then checks each stored snapshot. It also checks repaint/recovery isolation, interrupted gestures, stale callbacks, edits during Save, failed Save, linked metadata, reload, and persistence despite a repaint failure. Navigation tests distinguish opening a different outfit (an explicit persisted transition) from revisiting the current board (paint only). Runtime tests retain failure/retry and backup-flush coverage.

This pass uses synthetic automated tests; no new interactive browser or physical-phone check was performed. Published 0.2 and the stable demo are unchanged.

Validation for this pass: both full JavaScript suites passed, and the supported-Python suites passed (97 baseline-tree tests and 101 development-tree tests). Embedded-source checks and `git diff --check` passed. Logs: `/tmp/board-autosave-{performance-review,public-source}-{js,python}.log`.

## Save status and recovery (2026-10-25)

The board now displays separate persistent draft and outfit status, with explicit retry buttons after errors. Draft status reports pending, saving, retrying, failed, and saved states from the runtime. Outfit status distinguishes saving, failure, edits newer than the saved outfit, and an up-to-date outfit. Save buttons disable during the operation, expose a busy state, and identify a failed copy retry.

`state.outfitSave` owns the explicit save operation's board, target ID, copy/update intent, phase, and error. `setOutfitSave` is its transition point; `boardSaving` remains a compatibility guard for existing navigation and destructive actions. A weak map retains per-board operation state within the open tab. New and Undo New now require any failed outfit save on the active board to be retried first, matching the existing workspace-switch guard. Failed saves leave the editor intact. Retry reuses the target ID and takes a fresh snapshot, so an accepted request with a lost response does not create a second outfit or copy. Edits typed during a pending save remain in the editor and draft, with a notice that those newer edits still need Save changes. Failed board favorite updates also retain the intended value.

The runtime exposes draft status subscriptions and manual retry. One draft write is in flight at a time; acknowledging its older snapshot cannot mark newer queued edits saved. Existing debounce, bounded automatic retries, reconnect retry, unload protection, and backup flush are retained. Failed record writes are tracked by record path: retrying that record clears its failure without clearing unrelated failures. UI status subscriber errors cannot break storage.

Operation/retry identity is retained in the open tab, not a new persisted schema. Error copy explicitly asks the user to keep the tab open. No schema or algorithm change, and no change to the separate draft-versus-saved-outfit model.

Both full JavaScript suites passed, including new failure/status tests, and both supported-Python suites passed (97 baseline tests, 101 development tests). Synthetic tests cover lost responses, stable copy identity, latest-edit retries, duplicate clicks, failed favorites, New/Undo status recovery, synchronous failures, unrelated record failures, and in-flight draft edits. No new interactive browser or physical-phone visual check was performed. Logs: `/tmp/board-save-{performance-review,public-source}-{js,python}.log`.

## Saved-outfit previews and kept drafts

Saved outfit URLs (`#/outfits/ID`) show a preview with Edit outfit, Wore it, and Export image. The active editor remains at `#/board`; preview navigation and exports never adopt or save an editor document. Image rendering takes a detached document and passes it to background, frame, palette, and collage helpers so asynchronous rendering cannot read a different active board.

Edit outfit checkpoints the current workspace before switching. Failed checkpoints retain the current board. Failed explicit outfit saves must be resolved before a switch, preserving their retry identity. Reopening an outfit for editing resumes its kept edits if present; explicit Save changes still updates the saved outfit. Other drafts lists the retained boards by name; Resume switches to the chosen board. The post-switch toast also offers a shortcut to the previous board. New outfit also keeps the prior draft alongside its existing confirmation and Undo. Empty boards are not retained as drafts.

The optional board `workspace` member has version 1, an active key, a previous key, and an array of detached draft documents with timestamps. It travels through normal board autosave, reload, and full backup/restore without changing saved-outfit records or the archive format. Kept drafts with different edits are retained without automatic eviction. Snapshots whose editable content exactly matches a saved outfit are removed automatically when recovery is rendered or an outfit save succeeds. Saving adopts the outfit workspace key; leaving an unchanged saved outfit does not create another draft. Equality covers the name, supported placement/crop fields, text, design, and outfit metadata, ignores saved IDs and timestamps, and tolerates object-property order. Failed saves do not resolve recovery drafts. Clean linked outfits no longer also display “Draft saved”; unfinished boards show only “Autosaved.” Earlier app versions may drop this additional workspace member when saving a board, so keep a current backup before rolling back.

Checks: full JavaScript suite, synthetic repeated switches/reload/failure and detached-export checks, and 102 Python tests including workspace backup/restore. Bounded synthetic Chrome verified preview rendering, edit/checkpoint, confirmed autosave/reload, returning to original work, collection links, and 502-pixel collection actions. Physical-phone gestures and exhaustive theme coverage were not repeated.

Mobile board background permits vertical page scrolling and pinch zoom. Pieces (including text), collage slots, and palette overlays retain direct manipulation. Cut-out mode temporarily captures canvas gestures until it finishes or is cancelled. Background touches still clear selection without cancelling native scrolling.

The Add pieces to board picker mounts 60 thumbnail buttons initially, then appends batches while scrolling. Load more pieces provides a manual/keyboard fallback. Filters cover the whole closet, reset the mounted batch, and reject stale observer callbacks. See `tests/board-tray.js`. Progressive loading does not evict previously viewed thumbnails.


## Compact board header (2026-10-26)

The name and Save action come first on desktop and mobile. A single metadata row holds concise save feedback and Other drafts (N). Removed the separate Draft/Editing label, repeated save explanations, and duplicate persistent Return to previous work button. Other drafts expands to named Resume actions and disappears when no recoverable boards remain. Its summary uses a centered flex layout and the same 44-pixel touch target as the other controls.

Routine status is Autosaved for a working draft, Saved for an unchanged saved outfit, or Unsaved outfit changes when an explicit outfit save is still needed. Empty boards show no routine status. Pending writes, autosave failures, explicit-save failures, and both retry actions remain visible as needed; normal success text is suppressed while autosave reports a failure. Draft retention, matching-snapshot cleanup, save retry identity, and switching behavior are unchanged.

Validation: JavaScript save/recovery tests cover the shortened states, empty boards, and access to every named recovery entry through one control. Synthetic Chrome verified the collapsed and expanded mobile layout at 390 pixels in light Workshop and dark Field Notes, plus desktop positioning. No personal wardrobe was edited.


## Background removal from the board

Selecting a freehand piece or filled collage window exposes Remove background when its main photo can be processed by the local runtime. It checks local-tool availability and opens the existing photo review. Accepting adds a separate cutout and uses it as the piece's main photo throughout Closet Lint; the original stays available on the piece page. This does not write board placement or cutout-outline data. Discarding leaves photos unchanged. After acceptance, board photo caches and visible board/tray rendering refresh. Late availability responses are ignored after the board, selection, or main photo changes. See `tests/board-photo-tools.js` and `tests/photo-review.js`.


## Board recovery review (2026-10-26)

The 0.3 review found and fixed three edge cases. New and Undo New now stop on an unresolved explicit outfit-save failure, just as Edit/Resume already did. Previously, New could move failed work into a detached recovery snapshot that did not retain its in-tab retry target; a lost response followed by resuming and saving could create a duplicate outfit/copy. Retry stays on the same board and record ID. Error feedback explicitly says to keep the tab open. Retry identity still does not survive a reload; no persisted operation schema was added.

Collage piece-deletion Undo now restores the original window count, including intentionally empty windows. It leaves a subsequent window-count change or replacement layout intact. Clearing an outfit name while a save is in flight also remains a newer unsaved edit; the completion callback only normalizes the name if its entered value is unchanged.

Synthetic regression tests reproduce the failure boundaries and cover ordinary saves, Save a copy, uncertain responses, successful retries followed by Undo New, title clearing, collage restoration, and later layout choices. The full JavaScript unit suite passes, including runtime save serialization/retry, preview/checkpoint/reload isolation, navigation, deletion/Undo, and autosave boundaries. Embedded board sources and whitespace checks pass. No new browser/physical-phone check or Python rerun was needed for these editor-only changes; owner phone acceptance remains in progress. No new feature, schema, algorithm version, package, or deployment.


## Calendar to board (2026-10-26)

A future calendar day offers Create an outfit for this day and Choose a saved outfit. Create uses the existing workspace checkpoint/switch boundary to keep the current board before opening a fresh, dated draft. The date and Back to calendar remain visible; Save & schedule stays readable on mobile. Back checkpoints the draft, returns to that day, and schedules nothing. Other drafts can recover the previous work, including its text, layout, and photo crops.

The dated draft carries `calendarPlan` only in the board/workspace envelope, outside saved-outfit metadata. Save & schedule checkpoints a stable outfit ID, then writes the outfit and a stable plan key/date together in one outfit record. A lost response, in-tab retry, or reloaded dated draft uses the same target. This persisted identity applies to calendar planning; ordinary outfit/copy retry identity still lasts only for the open tab. Retry repairs its failed record before asking the global flush to pass. A failed protection checkpoint leaves the original board active. Outfit-write failures, final board-checkpoint failures, or edits made during saving keep the dated board open; the UI distinguishes an unwritten outfit from an outfit saved with recovery still pending. Navigation waits for Save & schedule, and success returns to the selected calendar day after the checkpoint succeeds.

Coverage: `tests/calendar-board.js`, board save/workspace/autosave suites, and route integration. Synthetic Chrome at 320, 390, 760, and 1280 pixels checked recovery, failure/retry, Back without scheduling, retained date after reload, readable save controls, and no page overflow in light Field Notes and dark Workshop. No personal wardrobe was edited. Weather/event details remain available through the existing saved-plan editor; calendar-created outfits initially schedule the selected date only.
