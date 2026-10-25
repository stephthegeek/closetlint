# Closet Lint 0.2.0

**Easier imports, a Closet Oracle, and clearer taste insights.**

Bring more of your wardrobe into Closet Lint, take your questions to your own AI assistant, and explore the outfits behind your taste patterns.

## What's new

- **A clearer start, and easier repeat imports.** Add pieces by hand, restore a backup, or prepare a request for your own assistant. An assistant with access to your wardrobe folder can use the supported importer; a regular chat can return a file or JSON text for you to review in Closet Lint. Recent-order requests include the stores and dates you choose. Closet Lint does not search your email or control your browser.
- **Earlier photo preparation.** Local thumbnails warm in the background, newly uploaded photos join the queue immediately, and periodic scans catch photos added by an assistant without a restart. The first six browse thumbnails get priority over offscreen images.
- **Import matching across your wardrobe.** Renamed pieces and original listing titles can flag owned or wishlist matches. One strong match defaults to updating the existing piece; uncertain or multiple matches need your choice. Review the comparison, choose a different action, or search for a piece manually. Updates preserve its photos, tags, name, and filled-in details.
- **One-file bulk imports.** Choose **+ → Bulk import pieces** and load a ZIP containing the assistant’s JSON and photos. Photos match by filename, and missing photos need review before saving. JSON-only import still works. The plus menu also offers Add a piece.
- **🔮 Ask the Oracle.** A dedicated page with normal navigation, browser Back/Forward, and question drafts retained during this visit. Choose your whole closet, a collection, or selected pieces, then prepare a wardrobe summary and question for your own AI assistant. Sizes, notes, purchase details, wear dates, and saved outfits are optional. You can also download up to 12 main photos to attach. The Oracle prepares the context; the conversation takes place in your assistant.
- **My taste, with the evidence.** Patterns count each distinct outfit once and follow your pieces' current tags and ratings. See Loved, Liked, and Passed counts, then open the actual rated outfits behind a pattern. My taste highlights up to three positive observations, two passed-on patterns, and three repeat-loved pieces, favoring supported observations and combining tags backed by the same outfits. Rated-outfit examples, Favorites, and pairs that don't work retain pages for longer lists.
- **More comfortable photo cleanup.** Tidy photos supports whole categories and subcategories, shows which photos are waiting or processing, and lets you choose ready results while later photos prepare. Each batch starts at the top. Save and continue or Save and close, with one clear count of the cutouts you are keeping. Originals remain available. Keeping an original skips it in future bulk runs; uploading a new photo makes the piece eligible again.
- **View settings in one place.** Find theme, thumbnail, icon, and photo-canvas choices in the menu. Reset display preferences without resetting your wardrobe or custom Fits like label. The storage guidance explains what belongs to this browser and what is saved in the local wardrobe.
- **Friendlier optional photo setup.** A read-only setup check explains what is ready and what needs attention. Photo imports and background removal can share an isolated Python environment, including a compatible environment you already set up. Missing photo tools do not prevent normal app use.

## Fixes and refinements

- ZIP imports reject overlapping entries and inconsistent local headers or data descriptors. Closing or replacing an import cancels loading; a total timeout bounds stalled reads.
- Compact previews across collections, Outfit Lab, My taste, saved outfits, photo strips, and import comparisons use thumbnails. Editing, zooming, image processing, downloads, and board exports keep original-resolution photos.
- Deleted pieces, bulk piece removals, hiding, storage, and donation flags offer Undo. Deleted outfits and trip plans can also be restored from their toast; failed Undo saves offer Retry.
- Import requests offer store data exports, optional browser help for email sources, and guidance about access, usage allowance, and bounded browsing batches.
- Import review flags small and very small photos using loaded preview dimensions, including alternate views, without blocking import.

- Wishlist jump controls compact to icons and counts on phones. Ranking photos load lazily through previews, Head-to-head prioritizes its two photos, and loading/failure states replace blank areas. Cold preview requests briefly wait for a ready WebP before falling back to an original.

- The mobile browse toolbar uses two compact rows. Color-picker selection markers stay round when the gradient resizes. Owner-selected emoji packs now apply consistently to scientists, setup wizards, trip fairies, and contextual controls.

- Wishlist has a reversible Pass section for pieces set aside for deletion. Pass preserves their scores, excludes them from Top ten and Head-to-head, and offers a confirmed delete action. Photos stay in color.

- Trips now retrieves recent seasonal weather without an assistant connection, keeps dates side by side on mobile, and returns to the top when switching steps. Trip outfit labels and actions use clearer themed styling. The mobile board keeps its name, Save, and title suggestion together; secondary controls fold under Board tools, with Outfit actions and Design tools groups.

- The local service reuses HTTP connections for photo requests. Idle browser connections no longer occupy active request slots; rejected requests close safely. Expected browser cancellations no longer print server tracebacks, while unrelated errors remain visible.
- Local browsing requests individual photos from older catalogs instead of downloading every legacy photo bundle. Optional WebP previews preserve transparency, while original images and backup contents stay unchanged. Normal request bursts queue safely, and the legacy fallback loader limits concurrent downloads and retries temporary failures.
- Import review makes possible matches, wishlist-to-owned changes, missing photos, and actual saves explicit. Ownership changes keep existing photos and tags. A failed batch stops safely, and retry keeps completed saves and uploaded photos within the open review session.
- Working-board autosave retries temporary connection failures, keeps the latest layout available, and confirms recovery. Save warnings include the service error, and a successfully retried board no longer blocks backup checks.
- Stalled import and Oracle photo downloads time out after 30 seconds. You can leave the Oracle during photo preparation, and failed downloads offer a way to retry or continue without photos.
- Taste analysis reuses one fresh statistics pass when comparing candidate outfits, while still reflecting later tag and rating edits. Lab suggestions now balance learned patterns with recent-piece variety and compatible exploration, rather than rewarding the same highly rated garment repeatedly. Internal selection and summary versions are tracked separately from the app version.
- Refined sidebar controls, photo canvases, saved-outfit filters, button sizing, and menu labels. Stretch uses single-choice chips, bulk selection survives navigation, and Accessorize preserves suggested shoes.

- The outfit board keeps its saved outfit identity: Save outfit creates it, Save changes updates it, and Save a copy creates a separate version. New outfit starts a fresh draft with Undo. Navigating away and back keeps the current board, and reloads retain which outfit it belongs to. Board tools separate outfit utilities from design controls, use clearer reset/stacking labels, and warn before layout replacement or rearranging. Major design changes, New outfit, removal, and piece-color edits offer recovery.

## Updating from 0.1

1. Save open edits, then choose **Menu → Utilities → Export backup**. Keep that ZIP and the old app folder until you have checked the update.
2. Stop the server, and extract 0.2 into a new app folder.
3. Start the new version with the same existing wardrobe data folder. Use an absolute `--data` path if the new app folder changes where a relative path would point.
4. Refresh the browser, check your pieces and photos, and try another backup.

You do not need to export and reimport individual pieces for an ordinary app update. Run only one server against a wardrobe at a time. See [the update guide](UPDATING.md) for moving computers and safe rollback.

## Requirements and limits

The core app still needs Python 3.10 or newer and a web browser. No account, AI subscription, or npm installation is required for normal use. Optional photo tools have separate dependencies; use the [setup check](INSTALL.md#check-your-setup) and [photo guide](PHOTOS.md).

An AI assistant is optional and separate from Closet Lint. Email connections, local file access, attachment support, and usage limits depend on the assistant you choose and the permissions you give it. A paid subscription alone does not grant access to your wardrobe folder.

Installation, imports, updates, and backup/restore have been checked on Linux with synthetic wardrobes. Windows and macOS installation remain unverified. Automated tests and security checks do not replace an independent human security audit. See [testing and verification limits](TESTING.md) and [security guidance](../SECURITY.md).

The local app has no login. Keep it on your computer or a trusted home network, and do not expose its port to the public internet. Public-demo changes stay in the visitor's browser. Background removal can lose fine details, so review the result before keeping it.
