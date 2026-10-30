# Bookmarks and browser navigation

Open a piece, saved outfit, collection, or saved trip, then bookmark the address or copy it from your browser. Main views also have addresses. Links use `#` routes, so they work with the basic local server without special hosting rules.

Examples, after your usual app address:

| Address | Opens |
| --- | --- |
| `/#/closet` | Closet |
| `/#/pieces/PIECE_ID` | Piece view |
| `/#/board` | Your current outfit board |
| `/#/sky` | Your Style Sky |
| `/#/sky/catalog` | All constellations |
| `/#/outfits` | Saved outfits |
| `/#/outfits/OUTFIT_ID` | One saved outfit |
| `/#/calendar?month=2026-11` | Calendar in a specific month |
| `/#/collections/COLLECTION_ID` | Collection in the closet |
| `/#/trips` | Trips |
| `/#/trips/TRIP_ID` | One saved trip |

Calendar month controls update the URL, so Back/Forward also follows month changes.

Use the actual address shown by the app; the IDs above are placeholders. Renaming an item does not change its address. A deleted or unavailable item returns you to the relevant list with a message.

## Back, Forward, and unsaved edits

Back and Forward follow app navigation. Returning to a browse view restores its filters and scroll position, including the loaded portion of the infinite list. Those temporary filters are kept in this browser history, rather than encoded in a fresh bookmark.

The Board remembers your current layout and the saved outfit it belongs to. Save outfit creates an outfit; subsequent saves update it. Save a copy creates a separate outfit and switches the board to that copy. New outfit confirms before clearing a populated board, including a clean saved outfit, and offers both a toast Undo and an Undo new outfit button. Opening another outfit also asks before replacing an unsaved draft. Navigating between pages keeps the current board; it does not switch to a hidden workspace.

Board autosave remembers your in-progress changes on this device; it does not update the saved outfit until you choose Save changes. Piece, trip, and collection forms still ask before discarding unsaved changes. Cancel keeps the current view and address. An unsaved trip's `/#/trips/new` address cannot restore an unsaved trip after a fresh load.

## Your Sky

Open Sky from the main navigation. Trips is in the hamburger menu. “Look up” opens the full chart; choose a star to see its readout and contributing pieces. The Sun, Moon, and Rising cards use your wardrobe, favorites/wishlist, and wear history. Emerging readings say “Still gathering.”

“Show these pieces” opens a temporary selection in the closet. “Choose pieces for board” filters the board’s piece tray; you choose what to add. “Share my sky” previews a local image of your three signs and their constellation chart, with no garment photos or private installation address.

“All constellations” opens the full catalog by house. “Words to search” offers plain search links in a new tab, with no affiliate tags or click tracking. Search destinations can be changed in `app/content/sky/search-links.json`; run `python3 tools/sync_sky.py` afterward.

## These links belong to an installation

A bookmark opens the wardrobe served at that app address. It does not upload anything, grant sharing permissions, or copy data to another installation. URLs and history contain navigation state, not photos, measurements, or working-board contents.

For a phone on your trusted network, use the laptop's working LAN address, rather than `localhost`: on the phone, `localhost` means the phone itself. The route after `#` stays the same. If the laptop's LAN address changes, update the bookmark's host address.

## Opening another tab and sharing Sky

Main navigation, piece photos and titles, saved outfit previews and titles, collection browse links, and saved-trip links support Ctrl-click, Command-click, middle-click, and the browser’s Open link in new tab menu. Ordinary clicks keep the existing unsaved-edit checks. A new tab opens the saved destination; it does not copy unsaved edits from the old tab.

Public static builds can use `sky.html` for Sky’s own social preview. The other views keep their usual hash routes on the regular page. To add this to an approved static package, run `python3 tools/build_sky_share.py --site-dir /path/to/site --site-url https://your-site.example/`, then deploy all generated files together. The tool preserves the package’s public data and the regular page’s existing share metadata. Local installations keep their existing hash URLs.

Board tools separate Outfit actions from Design tools. Collage mode switches, collage layout-family changes, and Arrange pieces ask before replacing the current presentation. Undo design restores the last major design change, including style, window replacement, crop/cut resets, and straightening; Undo arrange and Undo remove remain available for those actions. Recovery asks before replacing later design edits and never rewrites the outfit name or saved identity. Piece palette edits are identified as wardrobe-wide color changes and offer Undo.

## Saved outfit viewing and editing

Selecting a saved outfit opens its preview with Edit outfit, Wore it, and Export image. Your active board stays in place. Edit outfit keeps your current work as a draft before switching; reopening an outfit resumes its kept edits. Use Return to previous work or Kept drafts on the board to resume another draft. These drafts survive confirmed autosave and reload, and are included in full backups. Save changes explicitly updates the outfit.

Collection overview cards are full-card links. Collection pages offer Edit collection, Add all to board, and 🔮 Ask questions, with the piece count shown only in the main browse controls.

## Trips & events

The Trips & events menu destination combines saved trips with individual saved-outfit date plans. Coming up includes ongoing trips and today's events; undated plans appear separately, and past plans start collapsed. Add trip opens the trip wizard. Add event uses the existing saved-outfit scheduling form, so the same plan appears on the full calendar without creating a second event record or logging a wear. Trips show their first available pinned outfit as a thumbnail; event cards show their scheduled outfit preview and open that day's calendar details. Deleting an event keeps its saved outfit. View calendar opens the existing visual calendar.

## Getting started and measurements

Utilities → Getting started revisits optional closet identity, preferences, piece entry/import/restore, and photo-tool checks. View settings contains the closet name and Show Linty logo toggle. Identity is saved with the wardrobe; display preference reset preserves it.

Sizes & fit uses one Metric/US dropdown. Switching updates placeholders, visible unit hints, history display, and converts entered numeric measurements without clearing the form. Bra size and dates remain unchanged. Chest/bust, waist, hips, inseam, and height are the main optional measurements; neck, shoulder-to-wrist sleeve length, bra, underbust, and weight are additional options. Stored length/weight units remain inches/pounds, and existing history is preserved. Numeric display conversions round to one decimal. Clothing labels and Fits me continue to use selected clothing sizes, without automatic measurement-to-size conversion.

## Batch workspaces

Bulk import and Tidy photos have their own pages (`#/import` and `#/tidy-photos`). Getting started remains an optional setup dialog, and opens the import page when you choose assistant help. Existing direct/file routes, review decisions, and photo operations are unchanged.

Back/Forward retains closet filters and scroll position. Leaving a batch page keeps its in-memory review; active writes block navigation. Drafts, including imported photo bytes and prepared cutouts, are also kept in this browser for this wardrobe. The draft notice confirms a completed write or offers Retry on failure. If draft storage fails, retry or explicitly choose to continue without reload recovery; that fallback keeps the review only in the open tab and warns before reloading. Browser drafts do not sync to other devices and are not part of a wardrobe backup.

Reloading an import restores its choices and stable row IDs; committed additions are recognized, and saved rows remain locked. Direct-import installation details are checked again. Reloading a photo review retains ready cutouts and selections; interrupted preparation has an explicit Resume action. Saving still validates that each source is the current main photo. Start over / Choose pieces again explicitly discards an unfinished review after confirmation, without removing saved pieces or photos. Closing the browser during preparation or an active save warns first.
