# Release planning

**Published: [Closet Lint 0.3.0](https://github.com/stephthegeek/closetlint/releases/tag/v0.3.0).** The [release notes](RELEASE-NOTES.md) describe that download. Development source, the development demo, and individual hosted installations may contain newer changes; none of those alone establishes a new release.

## Current direction · 30 October 2026

- **0.4 review scope:** batch tools as pages, preserving their existing functionality and unfinished work, followed by a rethink of Trips. Keep the scope bounded and leave room for fixes and review before a feature freeze.
- **Already in development:** earlier Trip saving, packing-list export, photo-only preparation for existing pieces, action and toolbar cleanup, acquisition-date and wear-history improvements, stale-save protection, and atomic outfit wear logging. Implementation is not release acceptance; use the relevant tests and review the final package.
- **Additional 0.4 scope:** [Broader category catalog with sensible defaults and adaptive visibility](https://trello.com/c/PmVgxxxg). Implemented locally for review: expanded vocabulary, searchable category settings, sensible defaults for empty categories, populated-category visibility, and a Show all categories escape. Preferences save with the closet and backups. Existing classifications retain their identifiers; Eyewear is the display name for the existing Glasses category. Sweaters retain pullover/cardigan/vest types, with sweater-vest layering defaults. Release acceptance remains pending.
- **0.4 interaction review:** inventory further uses of `…` menus, especially secondary actions on mobile thumbnails and crowded cards/toolbars. Discuss which actions stay visible before implementing; preserve discoverability, touch targets, keyboard access, and Undo. This is the additional review item recalled on 30 October.
- **0.5 target:** broader photo work, including multiple uploads per piece and product/on-model handling, plus almanac ideas. Also target a wishlist ranking and decision-callout review for 0.5, unless a small, separately agreed improvement fits 0.4. Review whether the evidence helps choose between purchases, rather than merely describing shared tags. These are planning targets, not promised release dates or finished features.
- **Hosting:** experimental setup documentation and update/rollback checks are ongoing. Provider compatibility and full public deployment checks remain separate from local or private-pipe tests. See [hosting](HOSTING.md) and [recorded checks](TESTING.md).

Trello holds working task status; this document records release direction and durable decisions. It is not automatically synchronized with Trello.

Useful cards: [earlier Trip saving](https://trello.com/c/YXGQSPeZ), [packing-list export](https://trello.com/c/sisNiYF6), [photo-only preparation](https://trello.com/c/2jQFOy1s), and [action grouping](https://trello.com/c/Z11t4m9F).

## Moving toward feature freeze · 30 October 2026

The owner asked to move toward a 0.4 feature freeze after the approved recent-wear strip/badges and hosted-prompt corrections. Finish those accepted changes and the reported fortune/Sky polish, then focus on owner review, defects, recovery, documentation, and final package checks. Cold wear status and other new feature ideas remain backlog work unless explicitly brought back into scope. This is preparation for freeze, not release acceptance or publication.

## Owner review queue · updated 30 October 2026

Automated checks and implementation do not mark owner review complete. Trips and outfits have received substantial feedback; both remain open for another pass.

| Area | Review status | Remaining owner pass |
| --- | --- | --- |
| Trips & events | Partly reviewed | Days and activities, suggested versus pinned outfits, saving/reopening, packing quantities, and the latest contrast/layout fixes |
| Outfits & board | Partly reviewed | Updated toolbar, edit/save/return, calendar logging, export/share, and mobile alignment |
| Packing exports | Further review pending | Print/PDF with and without small photos, Markdown, category grouping, and optional outfit appendix |
| Batch tools as pages | Further review pending | Repeat import and Tidy photos, leaving/returning to unfinished work, and mobile controls |
| Piece pages & photo-only preparation | Follow-up review pending | Action grouping, photo options, split follow-up, and Undo |
| Categories & layering | Owner acceptance pending | Optional Metal & finish tags for jewelry, watches, and bags; four-step setup with category selection, defaults, Show all categories, populated-category visibility, sweater-vest combinations, and personal category-migration review. Eyewear now reads legacy Computer as Intermediate and explicit legacy Sunglasses into its dedicated subcategory. |
| Oracle & hosted prompts | Hosted wording/route corrections implemented locally; owner review pending | Scoped context/photos, downloads, explicit SSH versus local instructions, and an end-to-end hosted assistant session |
| Recent wears | Implemented locally; owner review pending | 3/8-day heat levels, ten-day visual strip with thirty-day heat thresholds, icon-only browse badges, Hot/Very hot filters, and Today/outfit-linked details |
| Acquisition dates & history | Owner acceptance pending | Approximate dates and manually backdated pieces; preserved wear history |
| Shared controls & `…` menus | Approved card menus implemented; owner review pending | Piece, saved-outfit, and collection menus; category-first filters; leaving collections through All/Closet/site title. Discuss other surfaces before changes. |

[Wishlist ranking and more useful decision callouts](https://trello.com/c/2i2CHu2Y) are tracked as a 0.5 target candidate, not an unannounced expansion of 0.4. Start from real examples of useful versus irrelevant callouts before changing the analysis or personal ranking behavior.

## Before the next release

1. Confirm the bounded scope, finish the planned review, and resolve reported defects. Check mobile and intermediate widths, all themes, hover/focus states, and recovery of unfinished work.
2. Review user documentation and release notes against the exact package. Clearly separate shipped behavior, development changes, and experimental hosting limits.
3. Run relevant regression, dependency, and security checks. Record failures and untested platforms alongside passing checks.
4. Build and inspect the release package. Test a fresh installation, updates from supported older data, and full backup/restore. Hosted candidates also need a separate test deployment and rollback, including large backups and access protection.
5. Complete physical-device checks for saving and sharing. Automated or desktop phone-width checks do not replace these.
6. Review the final source changes and CI results, then approve publication and any demo update separately. App updates remain manual.

## How task status maps to releases

Ideas → To do → Doing → Review → Done tracks implementation and acceptance. Done does not itself mean published. Keep each task on one card, and identify the release that actually includes it. Urgent fixes can ship as 0.3.x with checks appropriate to the change.

[Board guide](https://trello.com/c/HCtQ2ZVE) · [Release record](https://trello.com/c/n1dRmgpz) · [Next shortlist](https://trello.com/c/UW6aznwV)

## Historical 0.3 preparation notes

The archived checkpoints below describe development and review before publication. Their pending tasks, test counts, proposed announcements, and deployment instructions are historical; they are not the current work queue. Later checkpoints may supersede earlier behavior. The published release record above takes precedence, while untested platforms and other stated verification limits remain limits.

### Ready

- URL-first startup, saved-outfit search/rendering, warm thumbnail indexing, board module boundaries, autosave separation, and save-state recovery are implemented in development.
- Conservative CSS cleanup and the final theme/mobile checkpoint are complete. Retry-label clipping and the text-only Fantasy mode width conflict found during QA are fixed.
- Full development JavaScript suite and 101 supported-Python tests pass. Focused checks after the CSS fixes pass. Sky embedded sources are synchronized; scoring formula remains 2.0.0 because this review did not change scoring.
- The source-package preflight enumerates 181 allowlisted files, includes Sky code/content/share artwork, and reports no embedded wardrobe or scanned credential/path findings. This is not a new dependency audit, full-history secret scan, or extracted-package check.
- Synthetic mobile Sky Share opens its preview; desktop Sky has no horizontal page overflow in the checked viewport. See PERFORMANCE-REVIEW.md for measurement and visual limits.

### Before a release candidate

1. Scope confirmed: 0.3.0 includes Sky and the daily fortune. Saved-outfit preview and draft recovery are now implemented in development. Keep the mobile transport investigation and deeper state/CSS/cache work separate.
2. Integrate the requested development changes into a clean release branch based on published 0.2, preserving unrelated development work. Review the final diff rather than packaging the dirty development branch as an approved release.
3. Update release notes, README development wording, installation/update guidance, and testing/security records for the chosen scope. Describe Sky's Sun/Moon/Rising inputs, sparse-data fallbacks, exclusions, formula version, and local image sharing. Document the open-tab limit on save retries and the known mobile transport issue accurately.
4. Rebuild an unpublished candidate; verify its manifest and included source/assets. Test a fresh extracted synthetic installation, update from 0.2 with backup/restore, and the Sky share export. Repeat dependency, secret, and security checks against that exact candidate.
5. Continue physical-phone review already underway and resolve any blockers. Windows/macOS installation and broader accessibility verification remain separate limits unless tested.
6. Prepare the release announcement and stable-demo update for approval. Use `stephthegeek` in demo credits/text during that update. Publishing remains a separate step.

### Draft announcement direction

**Your wardrobe has a Sky.** Explore the styles you own, want, and wear through your style constellations, and save a shareable image of your three signs. This release also improves startup, outfit browsing, and board save recovery.

**A little guidance from Linty, too.** Reveal a daily fortune or wardrobe nudge. Keep it, dismiss it for the day, or switch it off.

### First candidate checkpoint

0.3.0-rc.1 is built, unpublished, and extracted. Its 182 manifest hashes and exact membership pass, as do the full JavaScript suite and 101 Python tests. A synthetic 0.2 data-folder update and 0.3 backup/restore retained state and photo bytes. npm’s lockfile audit reports zero vulnerabilities. Exact-package evidence was recorded with that candidate; local sidecar reports are not included in this repository. Final integration/security review, optional Python advisory checks, extracted browser/share-export acceptance, physical-phone verification, and the production rebuild remain before publication.

### QoL review batch

Implemented in development: stable Random closet sort with Shuffle again, full-card trip links with separate Delete, Train/bus wording, and consolidation of similar palette suggestions without rewriting chosen colors. Visual review is pending. Emoji curation remains deferred. The next larger UX priorities are saved-outfit preview/draft recovery and page/dialog consistency. Earlier saving in Trips and packing-list export remain separate backlog work.

### Saved outfit and collection batch

Implemented in development: saved-outfit preview pages, detached image export, checkpointed switching with persistent recovery through Other drafts, and collection-card links/action cleanup. Full JS and 102 Python tests pass; bounded synthetic Chrome checks confirm preview/edit/reload/return and the 502-pixel collection action row. Physical-phone acceptance remained pending at this checkpoint. The remaining larger UX priority is page/dialog consistency; emoji review remains deferred. No new package or deployment.

### Optional setup and Sizes & fit

Implemented Getting started with optional closet identity, units/emoji preferences, piece/import/restore choices, and read-only photo configuration status. Closet name and built-in-logo visibility persist in profile data; no custom logo upload. Sizes & fit has optional chest/bust, inseam, height, neck, and sleeve measurements plus a single unit selector with in-place input conversion. No body-measurement requirement was added to onboarding, and size matching/algorithms are unchanged. Full JS suite passes, including failed identity saves, defaults, measurement conversion, validation, and history preservation. Synthetic Chrome verified the three setup sections, shared identity save, optional photo status, and converting entered values. Physical-phone acceptance remains pending.

### Board picker performance follow-up

Implemented 60-piece progressive thumbnail batches with automatic scroll loading and a manual fallback; full-closet filters/search and existing item order remain intact. Full JS regression and synthetic desktop/phone-width checks pass. Large-list follow-ups are wishlist ranking, Sky detail piece lists, collection overviews/choosers, and long trip histories; see PERFORMANCE-REVIEW.md. Physical-phone acceptance remains pending.

The board header now uses one concise status beside Other drafts, below the name/save row. Duplicate draft/context instructions and the persistent previous-work button are removed; save failures and Retry stay visible. Mobile and desktop layout checks and save/recovery regressions pass.

### Sky list and bounded page/dialog review

Sky contributor cards now load on expansion and in batches of 24. The bounded review of recent screens corrected small mobile touch targets, moved the outfit-preview return link above the title, and checked heading/Close spacing and wrapping. Board piece tools now open background-removal review; accepted cutouts become the piece's main photo everywhere with originals retained. Full JS regression passes; synthetic desktop/phone-width checks cover representative recent screens. A physical-device pass and broader theme/accessibility coverage remain release acceptance work.

The same pass adds visible Sky link/card hover, pressed, and keyboard-focus states, plus draft-menu interaction feedback. Theme guidelines now require these states for new custom interactive controls.

Filter Type chips now show every available category without a More/Fewer types toggle. Sky reading/layout tabs also have hover, pressed, and keyboard-focus feedback while keeping the selected fill distinct. Focused theme/mobile/Sky checks and synthetic browser verification pass.

### Piece collections and compact photo options

Piece actions include 📚 Add to collection and the shorter Delete label. The chooser offers New collection with the current piece preselected; adding/creating preserves the open piece form and its unsaved values. Existing membership shows Already added. The bulk-add chooser also seeds new collections with the selected IDs. Photo swatches now sit inside collapsed Photo options, including without the optional local photo service; photo refreshes preserve the disclosure's open state. Desktop actions fit two rows at the checked 372-pixel form width; mobile controls retain accessible labels and 44-pixel targets. Full JS regressions and synthetic desktop/390-pixel checks pass, including failed-save retry and unsaved-form preservation.

### Laundry and care

Implemented in development from the reviewed v2 wireframes, adapted to the current piece/photo and board layouts. Tracking is off by default and saved with the wardrobe under Your closet in View settings. Manual Ready to wear / Needs laundry status supports single-piece and explicit mixed-selection batch actions, field-aware Undo, and failed-save retries. The closet filter and thumbnail badges show laundry needs without adding ready badges to every piece. Disabling tracking retains status and care records.

Care is collapsed above Original listing. Washing, Drying, and Care note save with Save changes. Add care-label photo saves a reference immediately while retaining unsaved form entries; label photos share the gallery but cannot become the main photo, supply swatches, enter photo cleanup/background removal, or appear on boards. Reclassifying a main photo chooses another garment view or a no-photo placeholder. Labels count toward the existing 12-photo limit. Photo removal retains the asset and offers Undo.

Lab and the board tray default to Ready to wear only when tracking is enabled; the explicit filter still applies in Fantasy mode. Lab's preference persists in the browser. Skipped clothing counts use the otherwise eligible base pool. Saved outfits and boards retain their pieces and show informational laundry feedback; the board reveals affected pieces in place. Trip packing rows flag laundry needs without excluding pieces from future plans. Wear logging, ratings, My Taste, Sky, and wishlist compatibility evidence do not change. Lab selection is now **2.1.0**; historical ratings retain their original version.

🗄️ identifies the top-level Stashed pieces menu, 📦 identifies storage, and 🎁 identifies donation. New modal actions also exposed an existing issue with native dialogs making the external Undo toast inert. Toasts now live inside the active dialog, return to the underlying dialog/body on close, and retain their node through dialog rebuilds.

Full JavaScript regression, synthetic storage/import/backup tests, and bounded desktop/390-/502-pixel Chrome checks cover the batch. Physical-phone acceptance remains pending. No new package or deployment.

### Settings and cleaning copy · review

The daily-fortune checkbox and its restore link now sit in Your closet, alongside logo visibility and Enable laundry tracking. This moves the controls without changing their persistence. Piece actions and the top notice use Needs cleaning / Set as clean; the sidebar filter, badges, saved-outfit notices, packing rows, and batch choices use matching cleaning wording. Lab/tray Ready to wear filters retain their availability wording. No selection algorithm changed. Focused laundry, themes, daily-card, and icon-pack checks pass; this copy/placement batch awaits visual review.

### Linty voice pass · approved cleaning copy and further review

Applied the reviewed success toasts: “Needs cleaning. Banished to the hamper.” / “Set as clean. Released from hamper jail.” Single-piece and bulk actions retain Undo and factual failure/retry messages. Care-label upload now uses “Care label saved. Tiny scroll acquired.” after success, with the shorter Care label saved inline status. The top piece banner remains plain Needs cleaning / Set as clean.

A genuinely empty cleaning list says “Nothing needs cleaning. The hamper is appeased.” This checks the full wardrobe; when cleaning-needed pieces exist outside the current filters, the message remains “Nothing needs cleaning with these filters.” Focused laundry, bulk/Undo, and modal-toast checks pass, and the embedded module is in sync. This copy batch was not browser-checked.

The existing creative backlog's CRE-08 and ongoing voice pass call for occasional personality in helpful hints, empty states, and successful actions. Keep navigation, action labels, measurements, destructive confirmations, and save errors literal. Be kind to bodies, budgets, taste, and personal cleaning routines. Do not use the daily-fortune checkbox as an implicit switch for unrelated UI voice. No new voice setting or extra persistent helper paragraphs were added.

The follow-up reviewed copy is applied: empty closet “Every good pile starts with one piece.”; empty board “Add pieces from your closet. Mischief starts here.”; plain “Piece added.” for manual owned-piece additions; and image-export success “Image saved. A little wardrobe artifact.” Wishlist/Fantasy notices remain intact. Avoid “hoard” in these lines.

Applied the reviewed Lab loved-outfit toast: “♥ Loved. A keeper for the good pile.” Add to board remains available. This is an outfit rating, not a single-piece favorite or a save to Your outfits. No rating or selection behavior changed, so no algorithm version bump is needed.

Existing voice worth keeping: Collections' “Gather a few pieces and give the pile a name” and “A very good little pile”; Lab's “No treasures in this pile yet”; Sky's “Linty is watching this corner”; and Trips' trip-fairy/suitcase copy. Daily fortunes and the Oracle already provide larger personality moments. Avoid adding a second mascot voice to every trip step.

Keep board recovery and saved-outfit identity messages factual: they explain what was saved, what is being edited, and whether other work is retained. Likewise, leave backup completeness, partial imports, wear history, fit, wishlist evidence, errors, and destructive warnings precise. Do not add jokes to autosaves or repeated redraws. Packing completion could be a later opportunity if an explicit completion state is introduced; this pass adds no new behavior for a quip.


### 0.3 board/recovery review · 26 October

Fixed three issues in existing flows: New/Undo New can no longer leave an unresolved outfit-save retry behind; collage deletion Undo restores empty windows without overwriting later layout choices; and clearing a title during Save is preserved as a newer edit. Failed-save feedback explicitly asks the user to keep the tab open. Synthetic regression coverage and the full JavaScript suite pass; this is not final-package or physical-phone acceptance. See BOARD-EDITOR.md for the exact boundaries. Continue reviewing the implemented features and phone findings; no new feature scope, packaging, or deployment.

Earlier Trips saving remains a tentative future improvement: allow a named, incomplete plan to be saved and resumed, with a clear distinction from a generated plan. Review required fields, validation, and complete save scope before implementing. Do not add it to the 0.3 review.

### 0.3 laundry/care review · 26 October

Fixed overlapping care-label uploads: changing care fields or refreshing photos no longer unlocks Add care-label photo while an upload is pending. Failed uploads release the control and preserve unfinished care entries. Bulk cleaning now counts only successful changes, excludes unchanged pieces from the updated count, and says Nothing changed when the selection already has the requested status. Care upload and the top Set as clean action have 44-pixel minimum heights.

Synthetic regressions and the full JavaScript suite pass. Bounded Chrome checks at 390, 700, 820, and 900 pixels cover representative Soft Hardware, Field Notes, and Night Bloom layouts in light/dark and text-only modes. Verified status/Undo, injected save and Undo failures with Retry, care save/reopen, upload with unfinished fields retained, Lab replacement of an unavailable suggestion, independent Lab/tray filters, and board notice/eligibility refresh without removing placed pieces. Existing availability rules are unchanged; Lab stays at 2.1.0. These checks do not replace physical-phone touch acceptance. No new features, package, or deployment.

### 0.3 Sky/share/fortune review · 26 October

Fixed cached daily reminders that survived hiding/removing a piece or moving it to the wishlist. Cached Do reminders also respect storage; the existing neglected-favorite reading can still refer to stored pieces. Same-day replacement preserves reveal/dismissal choices. Generation rules and algorithm version 1 are unchanged.

Sky export now blocks duplicate export taps, uses the encoded layout in the filename, reports conversion/share errors, releases controls after errors or native-share cancellation, and cancels a still-pending export when its sheet closes. Share-layout hover/pressed feedback survives theme overrides. Sky share/Close controls and fortune dismissal have 44-pixel minimum targets; small fortune cards reserve clearance beneath dismissal. Sky formula remains 2.0.0.

The full JavaScript suite and four Sky Python tests pass, with additional focused cache, save-failure, and export-recovery regressions. Synthetic Chrome checks at 390, 700, 820, and 900 pixels cover representative light/dark themes, text-only Sky actions, map/detail return, contributor batches, Square/Story export, fortune reveal/reload, dismiss/restore, enable/disable, search exclusion, and the smallest grid density. Downloaded 1080×1080 and 1080×1920 images were inspected. Native phone share-sheet behavior is covered by simulated API responses only and still needs physical-device acceptance. No feature additions, package, or deployment.

### 0.3 Trips save/recovery review · 26 October

Fixed shared references between opened and saved trip settings/checkmarks, plus false unsaved warnings for older partial occasion settings. Explicit Save now captures detached data, blocks duplicate requests, preserves title edits made during the request, and reuses a reserved trip ID on retry. First Save still happens after plan generation and adopts the saved trip URL; no earlier/incomplete-trip saving was added.

Packing autosave uses a separate timer per trip, serializes writes with explicit Save, retains edits arriving during a write (including first Save), and leaves unsaved trip details alone. Failures retain the current checkmarks and show persistent feedback with Retry. Pending/failed packing changes count as unsaved; leaving during a write is blocked, and confirmed discard cancels delayed packing writes. Save status distinguishes saved packing from remaining unsaved trip changes. Delete/Undo now snapshots the latest saved record rather than a stale rendered card.

Added focused save-state and routing regressions; the full JavaScript suite passes. Synthetic Chrome checks at 390, 700, and 900 pixels cover mobile/intermediate layouts, representative light/dark themes, text-only actions, packing save/reload, injected autosave and explicit-save failures with Retry, delayed-save navigation, newer title preservation, delete failure, and failed Undo followed by successful restore of packing progress. The phone header places the name above aligned Edit/Save actions with 44-pixel targets. Physical-device acceptance remains separate. No planning algorithm/schema change, feature addition, package, or deployment.


### 0.3 Wishlist evidence review · 26 October

Fixed one-piece compatibility missing cardigans normalized under Tops and other recorded layers. Mixed palettes with a multicolor placeholder no longer count as wholly neutral merely because a known accent is neutral; explicit shared colors remain useful. Wishlist analysis is now **2.1.1**. Similarity still requires the same category/subcategory, exact known palette, and a shared descriptive tag. Favorites, recent distinct wear dates, and latest-per-combination positive Lab ratings provide qualified context, without changing preference scores or order. Lab and Sky versions are unchanged.

Head-to-head now refreshes live records/evidence while retaining valid pair IDs after wardrobe edits. Keyboard activation of its nested Open details control no longer submits a preference. Wishlist details, price, and section-move targets are larger on mobile/intermediate screens, and comparison actions clear the fixed bottom navigation.

Focused regressions and the full JavaScript suite pass. Synthetic Chrome checks cover Ranking, Compact, and Head-to-head at 390, 700, and 900 pixels across representative light/dark themes and text-only controls, long titles/notes, evidence wrapping, details via Enter/Space without rating, and saved edits refreshing the same comparison pair. Physical-phone acceptance remains separate. No new features, package, or deployment.

Future packing-list work also includes a [Trips copy/UX review](https://trello.com/c/sisNiYF6), especially packing progress versus planned outfits, approximate bag-space guidance, repeated helper text, and mobile presentation. Keep this alongside the packing-list additions, outside the 0.3 fixes/checks scope.


### 0.3 direct assistant import setup · 26 October

Added the approved direct-import workflow fix. Set up direct import supplies the running installation's actual folders, computer, shell commands, intended wardrobe identity, and photo-readiness information. It explains local Claude Code and ChatGPT/Codex sessions, cloud/GitHub limitations, phone remote-control prerequisites, and independent source-photo/email/browser permissions. A setup-only request records a real local check before Continue is enabled; valid setup can be reused, and every import request rechecks access/identity.

Direct requests now use the CLI contract and schema, exact preview/apply/status commands, a batch working folder, and a stable batch ID. They do not include browser ZIP instructions or silently switch routes. The importer enforces the expected wardrobe identity inside its transaction, including completed-batch retries. Check import reads the committed receipt, distinguishing saved additions from checks/previews and zero-new-addition retries. Pending batches resume after closing/reloading; saved results appear first, with guarded Load saved additions and a new-ID Start another import action. Checks have bounded timeouts and recoverable errors. The existing local request authorization protects installation metadata; no remote write bridge or assistant credentials were added. Algorithm and storage-format versions are unchanged.

A fresh assistant context received only the generated setup/import requests and two named synthetic photos. It verified setup, previewed and saved two owned pieces/two photos, checked the receipt, and retried the identical batch with zero new additions/photos. The app independently confirmed the original receipt and loaded both pieces. Browser checks cover 390-/700-/900-pixel layouts, both provider guides, pending-batch recovery, verified setup reuse, and an injected check failure/retry with the same batch ID. Full JS and 111 supported-Python tests pass at the review checkpoint, with focused checks after final UI/transport refinements. Physical-phone and actual Claude-client acceptance remain separate. No package or deployment.


#### Shared bulk-import sources review

- Source uploads now work across photos, emails, product links, order/wishlist pages, and store exports. Local batches retain uploads and per-item product-photo guidance; no piece is created by uploading.
- Local Codex/Claude Code receive exact paths. The optional image-editing request preserves originals, labels recasts, and reports unavailable editing rather than promising it. Chat imports can reuse originals by batch-scoped source ID and return only newly edited photos.
- One source photo per item in the upload UI; screenshots/references are separate from items. Keep existing multi-photo import compatibility for older files.
- Release check: exercise phone upload → fresh local assistant → verified saved result with the user's chosen assistant. Synthetic tests cover source access and save behavior; they do not certify image-generation quality or every provider's account/tool availability.


#### Bulk import/photo completeness review · 26 October

- Changed visible unit labels from Imperial to US; saved unit preferences and conversions are unchanged.
- Closed the sparse-tag prompt gap for every source, provider, and direct/file route. The shared request now explicitly asks for supported visual/style tags, distinguishes Occasion (`styles`) from Aesthetic (`looks`), and leaves unknown factual details blank. Both vocabulary contracts now include field labels and category/subcategory scopes. Existing tag storage already supported these fields; no algorithm or import-format version changed.
- The current flow includes shared retained uploads, optional per-item isolated photos and guidance, original/recast handling, destination/setup checks, duplicate review, save retries, and committed-result verification for direct imports. File imports reuse staged originals and support edited photos in a returned ZIP.
- Remaining acceptance: a fresh request with the updated tagging instructions, actual image-editing quality, file-route round trip with an assistant’s returned ZIP, and physical-phone review. Windows/macOS execution remains unverified. Existing synthetic checks are not proof of each provider’s tools or permissions.
- Known limits: no automatic retagging of saved pieces; duplicate updates preserve tags/photos. File-route retry state survives only in the open review, without direct-import batch receipts. Shared uploads do not grant an ordinary chat local access, run an editor, or become saved pieces by themselves. These limits should stay explicit; do not expand scope to a new editing service or bulk metadata-update feature during this review.


#### File import acceptance and tag repair · 26 October (27 October UTC)

- Exercised the file route through the real browser UI in an isolated synthetic installation: upload two sources, select isolated-photo guidance, generate the request, return a ZIP with a recast fixture and batch-scoped original references, edit tags in review, trigger a write failure, retry, save, reload, and reopen a portable ZIP for duplicate review. Original/recast order, main photo, ownership, tags, unknown sizes/prices, unchanged assets on retry, and zero duplicate additions were independently checked in saved storage. The returned ZIP was a test fixture, not a new provider-generated result or image-quality assessment.
- Fixed a misleading zero-save recovery heading and finish button, and made the completion summary say existing updated for both existing-piece updates and wishlist promotion. Added spacing around upload helper text, download buttons, category fields, and photo/tag details. Review names use the full card width on mobile and intermediate layouts.
- Visual checks: 320px Workshop dark (loader, recovery, and review), 390px Field Notes light (uploads, handoff, review, and saved results), 760px Field Notes light (two-column review/comparison), and 1280px Workshop dark (review and comparison). Later name-layout refinement was verified at 390px and 760px. Checked footer targets, wrapping, and horizontal overflow; physical-phone touch acceptance remained pending at this checkpoint.
- Future idea only: [multiple uploads per piece, especially care labels](https://trello.com/c/HVjlRV1y), in Trello Ideas with Later. Preserve grouping, distinguish reference labels from garment/main photos, and support both direct and file routes. No multiple-image uploader was added to 0.3.


#### Calendar overflow and remaining review · 26 October (27 October UTC)

Fixed horizontal scrolling in the calendar day dialog: its saved-outfit selector now shrinks within the row, removes the inherited left margin, and wraps alongside Log it at narrow widths. The dialog still scrolls vertically when needed; overflow is not hidden as a substitute for sizing. Scoped button sizing/wrapping preserves the current theme.

The label Plan an outfit was ambiguous: it could suggest creating a new outfit rather than scheduling a saved one. It currently schedules a saved outfit, while Log records a past/today wear. Renamed the calendar action and chooser to Schedule a saved outfit, and the specific-outfit title to Schedule this outfit. Calendar-to-board creation is not implemented and was not added during this fixes-only pass; it would need explicit date propagation through board drafts, saving, and recovery.

Synthetic Chrome verified the day dialog at 390px and 1280px in Field Notes light with a long selected outfit name: scrollWidth equals clientWidth at both widths. The scheduling chooser also stayed within the mobile dialog. No plan or wear was written, and no personal wardrobe data was used. Focused theme, saved-outfit, Trips-navigation, and app-routing checks pass.

Remaining before release preparation:
- One focused controls/settings review: Getting started, closet autosave/retry, units/history, piece/collection actions, and Random/palette behavior. Existing checks exist; this is final acceptance and fixes, not a request for more features.
- Calendar/wear logging interactions beyond this layout check, including scheduling versus actual wear, remove/undo or failure behavior where supported, and navigation back to the calendar.
- Physical-phone acceptance, including native sharing and actual assistant photo/tagging output. Browser fixtures do not certify provider tools, image quality, or physical touch behavior.

Then resume release preparation: clean settled snapshot/diff, current documentation and known limits, final regression/security checks, and an extracted fresh-install/0.2-update/backup-restore checkpoint when packaging is requested. The early rc.1 predates these changes. No packaging or publication was performed.


#### Calendar to board · 26 October

Create an outfit for this day now opens a separate dated board after checkpointing the active work. Save & schedule saves the outfit and date together, retries the same target after a lost response or reload, and returns to the selected day only after success. Back to calendar checkpoints the unfinished draft without scheduling it. Current work remains available through Other drafts. An injected browser save failure exposed a global-flush retry ordering issue, which is fixed and covered. Mobile/intermediate/laptop checks used synthetic data only. This implements the explicitly approved calendar handoff; weather/fitness integrations remain future considerations. Getting started menu placement was discussed separately and has not been changed.


#### Import scope and continuation · 27 October

Removed the ten-piece default from both import routes. The optional limit starts empty; direct requests work through their selected scope in sequential, atomic save parts, and Check import combines verified committed results separately from the assistant-reported completion/needs-input/paused state. Reopening restores request choices even without uploaded files. Stable part receipts retain safe retries, cross-part duplicate checks, tags, and backup restoration. A completed request rejects new parts; legacy single-batch requests remain readable. File requests can return numbered files, and Load next file retains staged originals during the open review. First/new requests reuse verified setup without inheriting a piece limit. Existing already-copied requests remain unchanged; restart the server and refresh before preparing the new workflow.

Common tagging instructions remain in every source/route. Unrelated pieces in one photo need clarified intent or manually prepared crops. Confirmed multipacks now use the subsequently approved preparation options below; no multi-view uploader was added. Store is free text with the last entry remembered. Temu and Amazon product-link normalization is matching support, not store integration certification. Documentation now distinguishes generic handoffs from unverified retailer examples; future coverage is [backlogged](https://trello.com/c/CMpNPWqK), labeled Later.

Validation: full JavaScript unit suite, focused rechecks after UI refinements, 29 focused Python tests (11 assistant/request, 14 piece-import, 4 source-upload), embedded setup sync, and whitespace checks. Synthetic Chrome checked a 55-piece/two-part paused request, original saved scope after reopening, completed aggregate result, reusable setup/new blank limit, and 390/760/1280-width layouts. No personal wardrobe, live email source, paid assistant run, packaging, or deployment.


#### Multipack and product-photo preparation · 27 October

Added two independent, initially unchecked choices to every source and both import routes: Separate multipacks into individual pieces, and Create an individual product photo for each piece. Record splitting alone keeps original photos; photo creation includes separating confirmed pack members onto plain backgrounds. Normal pairs stay together, quantities alone do not establish contents, each resulting record counts toward the optional limit, and pack totals are not copied to every member. The existing tagging pass remains common to every route.

Global photo choice updates uploaded item choices; individual uploads can override it and retain photo guidance. Request choices persist through reopening, and new requests reset them. The assistant may follow explicit later user changes; returned photo-request metadata represents the final choice. One original per piece plus an optional recast remains the image contract, with shared pack originals allowed. There is no independent image-splitting checkbox, new image service, or automatic model-photo recoloring.

Optional productPhotoRequested/photoNote notices are retained in file review/results and direct receipt photoStatus, not garment tags. Missing/declined/failed image editing falls back to originals and explains the assistant-reported reason. The image-capable ChatGPT/Codex workflow is the intended complete path; other available editors are supported by the request. Real editor availability and output quality still require actual-session acceptance.

Validation: full JavaScript suite, focused setup rechecks, 31 Python import/request/source tests, source sync, and whitespace checks. Synthetic three-beanie preview/apply/retry produced three variants with one shared original, no retry duplicates, retained tags, and visible fallback explanations in Check import. Synthetic Chrome checked both selections, per-upload inheritance, generated request, a new request resetting both choices, and 320/390/760/1280 layouts across Field Notes/Workshop light/dark. No personal wardrobe or actual AI image-generation run was used.

#### Setup spacing and saved-outfit scheduling · 27 October

Tightened closet checkbox spacing, separated setup tabs/headings and Trips helpers/actions, and made setup dropdowns fit their options instead of stretching across the dialog. Getting started now uses shorter helper text and no longer suggests a small import batch. “Setup optional photo tools” shows a green check after a successful check confirms both browse previews and background removal; a subsequent unavailable/error result clears it, and checking remains repeatable.

Scheduling an already chosen outfit now asks only for a date and optional event name, with a View calendar action after successful saving. Editing preserves older location/weather/dress-code metadata. Detailed planning remains in Trips, including one-day trips. Focused regressions cover failed scheduling saves/retries, metadata retention, calendar navigation, photo readiness, and existing direct/file import variations. Synthetic Chrome checked setup at 390 and 1280 pixels, compact closet settings at 390, and scheduling/save/calendar return at 390. Trips spacing was source-reviewed, not re-exercised visually in this pass.

Remaining acceptance stays focused: settings autosave/retry and measurement/history controls, piece/collection actions, Random/palette acceptance, and calendar wear-log removal/undo/failure behavior; continue physical-phone review. No new release package was built.

Future brainstorms only: [monthly calendar keepsake/export](https://trello.com/c/7z2XgHsQ) and a separate [year-end wardrobe recap](https://trello.com/c/g4d0jXUd), both in Trello Ideas with Later. Use recorded wear, distinguish plans and taste ratings, show gaps honestly, and avoid making completeness claims from sparse logs.

#### Release preparation resumed · 27 October

Release preparation resumed. The former “controls/measurements, piece/collection actions, Random/palette, and calendar recovery” labels describe spot checks of existing behavior, not unfinished features. Focused coverage includes settings save failure/unit-history preservation, collection membership/actions, stable Random order, palette Undo, and calendar scheduling/save/retry. A calendar wear-write failure found during the final pass is fixed: failed piece writes no longer produce a successful outfit log, open-tab retry preserves added-date provenance, duplicate taps share the request, and failed removals remain retryable. Keep the tab open for partial wear-save recovery; this is not a new atomic storage transaction. Final visual acceptance remains ongoing.

Prepare an unpublished 0.3.0-rc.2 snapshot, verify its extracted source/tests, fresh installation, and synthetic update/backup restore, and record advisory/secret checks beside that exact archive. Preserve the existing development and earlier release worktrees. The snapshot is an audit artifact, not a selected release commit; final integration/diff approval, CI on that commit, final production rebuild, and publication approval remain concrete gates. Do not repeat completed feature reviews without a failure or new reported issue.

Prepared 0.3.0-rc.2 as an unpublished isolated audit snapshot. Its 200 manifest hashes, extracted JavaScript suite, all 122 Python tests, fresh core startup, synthetic published-0.2 update and full-backup restore, npm/Python advisories, and snapshot/history secret scans passed. Exact-candidate browser smoke confirmed restored photos, outfits/history/plans, daily card presence, and Sky/share preview. The download notification timed out, so actual saved Sky image/native sharing remains a concrete acceptance check. Clean release-commit integration/diff review and CI, physical-phone acceptance, final production build, and publication approval remain; details and the exact hash were recorded with that candidate in a local sidecar report.

#### Next dev-site update: notice wording

On the next dev-site change, use this exact notice: “stephthegeek's wardrobe, running the latest Closet Lint code. Changes are only in your browser. See the included 12-piece demo →”. Keep the demo phrase linked to https://demo.closetlint.com/. Apply through the shared source/exporter, not by hand-editing deployed HTML. This is queued copy for the next update; do not deploy solely for this wording.


#### Queued dev notice links and next-release action review · 27 October

Keep the queued notice wording, with lowercase stephthegeek linked to https://stephthegeek.com/, Closet Lint linked to https://closetlint.com/, and “See the included 12-piece demo →” linked to https://demo.closetlint.com/. Apply on the next dev-site change; no wording-only deployment requested.

[Review action order and grouping](https://trello.com/c/Z11t4m9F) is in Ideas with Next · tentative, explicitly outside 0.3. Start with piece pages, then inspect collections, saved outfits, Board tools, Trips, and Photo options. Inventory frequent/secondary/destructive actions and propose their grouping before moving buttons. Delete should be placed deliberately at the end or separately, with related hiding/removal actions grouped where useful.

Documentation review corrected the 0.3 installation example, distinguished ordinary open-tab retries from durable dated-board/import receipts, added laundry to the README, clarified that wishlist order is user-controlled, explained both import routes and optional pack/photo preparation, and softened the photo-editor promise. These are source changes for the next candidate; rc.2 remains an immutable earlier checkpoint.

#### Dev garment sizes · 27 October

The public exporter gained an explicit `--include-sizes` option, checked against the export manifest. Sizes remain omitted by default, and body measurements and the personal fit profile remain excluded. An approved development-demo export retained the existing photos and records while adding recorded sizes. Tests cover the opt-in, default omission, private-profile exclusions, and manifest tamper refusal.

#### Final filter/label fixes · 27 October

Completed the agreed Size not recorded / Not applicable / One size cleanup with consistent counts/results, one shared one-size choice, and compatibility for older one-size selections. The main + menu button now says Add; submenu actions remain specific. Focused behavior tests and synthetic 390/1280 layouts pass. Next step is the isolated release-branch integration and exact-commit CI, incorporating the documentation pass and approved dev-export size fix; no new feature scope.

The integration checkpoint based on published v0.2.0 passed the full JavaScript suite and 123 Python tests. Remote CI, final packaging, and publication had not completed at that checkpoint; the published 0.3.0 release supersedes that status.

Metal & finish expands the existing metal tags with optional rose gold, bronze, copper, and gunmetal tones, plus antiqued, blackened, brushed, and hammered finishes. Material, Metal tone, and Finish share one disclosure on jewelry, watches, and bags. Existing values remain valid; the universal color palette and Lab/Sky scoring are unchanged. Import vocabulary and prompts include the same choices. Owner review remains pending.
