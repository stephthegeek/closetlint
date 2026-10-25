# Closet Lint 0.2.0

**Easier imports, a Closet Oracle, and clearer taste insights.**

Bring more of your wardrobe into Closet Lint, take your questions to your own AI assistant, and explore the outfits behind your taste patterns.

## What's new

- **One-file bulk imports.** Choose **+ → Bulk import pieces**, prepare a request for your own assistant, and load its ZIP containing JSON and photos. JSON-only import still works. An authorized local assistant can also use the supported importer directly. Recent-order requests include your chosen stores and dates; Closet Lint does not search your email or control your browser. The plus menu also offers **Add a piece**.
- **Matching across owned and wishlist pieces.** Product links, original listing titles, and names help identify existing pieces. For owned imports, one strong match defaults to updating the existing piece; uncertain or multiple matches need your choice. Updates preserve existing photos, tags, names, and populated details. You review the batch before anything is saved.
- **🔮 Ask the Oracle.** A dedicated page prepares a wardrobe summary and question for your own AI assistant. Choose the whole closet, a collection, or selected pieces, with optional details, saved outfits, trips, and up to 12 main photos. Question drafts stay available during the visit. The conversation takes place in your assistant.
- **My taste, with the evidence.** See a few strongest observations and open the rated outfits behind them. The summary highlights up to three positive observations, two passed-on patterns, and three repeat-loved pieces. Patterns count distinct outfits and reflect current tags and ratings; longer evidence lists remain paginated.
- **More variety in Outfit Lab.** Suggestions balance learned patterns with recent-piece variety and compatible exploration. Ratings still influence suggestions without directly rewarding repeated use of the same highly rated garment.
- **More comfortable photo cleanup.** Tidy photos supports whole categories and subcategories, shows processing progress, and lets you choose ready results while later photos prepare. Use **Save and continue** or **Save and close**. Originals remain available; keeping an original skips it in future bulk runs, while uploading a new photo makes the piece eligible again.

## Fixes and refinements

### Imports and recovery

- Import requests offer store data exports, optional browser help for email sources, and guidance about access, website permissions, usage allowance, and bounded browsing batches.
- Review makes existing matches, ownership changes, missing photos, and completed saves clearer. Small-photo notices cover main photos and alternate views without blocking import.
- A failed batch stops safely. Retry retains completed saves and uploaded photos within the open review session.
- ZIP validation rejects unsafe, overlapping, or inconsistent entries. Closing or replacing an import cancels loading; stalled reads and Oracle photo downloads time out. Failed Oracle downloads offer retry or a way to continue without photos.
- Deleted pieces, bulk removals, hiding, storage, and donation flags offer Undo. Deleted outfits and trip plans can be restored from their toast; failed Undo saves offer Retry.

### Photos and optional setup

- Compact previews across collections, Outfit Lab, My taste, saved outfits, photo strips, and import comparisons use thumbnails. Editing, zooming, image processing, downloads, and board exports keep original-resolution photos.
- Local thumbnails prepare in the background, newly uploaded photos join the queue, and periodic scans discover assistant-added photos. The first six browse thumbnails get priority. Local browsing also avoids downloading every legacy catalog-photo bundle.
- Optional previews preserve transparency. HTTP connection handling and temporary-failure retries are improved, and expected browser cancellations no longer print server tracebacks. These changes do not establish a fix for the deferred mobile photo-transfer stall; see [verification limits](TESTING.md#02-verification).
- A read-only setup check explains what is ready. Photo imports and background removal share an optional isolated Python environment and can reuse compatible existing setup. Missing photo tools do not prevent normal app use.

### Outfit boards, browsing, and trips

- **Save outfit** creates an outfit, **Save changes** updates it, and **Save a copy** creates a separate version. **New outfit** starts a fresh draft with Undo. Navigation and reloads retain the current board and its saved outfit identity.
- Board tools separate outfit actions from design controls, use clearer reset and stacking labels, and warn before layout replacement or rearranging. Major design changes, New outfit, removal, and piece-color edits offer recovery. New boards default to a white background.
- Board autosave retries temporary connection failures and confirms recovery. Save warnings include the service error, and a successfully retried board no longer blocks backup checks.
- Wishlist has a reversible **Pass** section. It preserves scores, excludes passed pieces from Top ten and Head-to-head, and offers a confirmed delete action. Ranking photos use previews with loading and failure feedback, and jump controls compact on phones.
- View settings group theme, thumbnail, icon, and photo-canvas choices. Display reset keeps wardrobe data and the custom Fits like label. Emoji tweaks remain available for further design review.
- Mobile browse controls, saved-outfit filters, piece-header toggles, menu labels, and color-picker markers are more consistent. Bulk selection survives navigation, Stretch uses single-choice chips, and Accessorize preserves suggested shoes.
- Trips can retrieve recent seasonal weather without an assistant connection. Dates stay side by side on mobile, switching steps returns to the top, and outfit labels and actions use clearer styling.

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
