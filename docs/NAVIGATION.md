# Bookmarks and browser navigation

Open a piece, saved outfit, collection, or saved trip, then bookmark the address or copy it from your browser. Main views also have addresses. Links use `#` routes, so they work with the basic local server without special hosting rules.

Examples, after your usual app address:

| Address | Opens |
| --- | --- |
| `/#/closet` | Closet |
| `/#/pieces/PIECE_ID` | Piece view |
| `/#/board` | Your current outfit board |
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

## These links belong to an installation

A bookmark opens the wardrobe served at that app address. It does not upload anything, grant sharing permissions, or copy data to another installation. URLs and history contain navigation state, not photos, measurements, or working-board contents.

For a phone on your trusted network, use the laptop's working LAN address, rather than `localhost`: on the phone, `localhost` means the phone itself. The route after `#` stays the same. If the laptop's LAN address changes, update the bookmark's host address.

## Opening another tab

Main navigation, piece photos and titles, saved outfit previews and titles, collection browse links, and saved-trip links support Ctrl-click, Command-click, middle-click, and the browser’s Open link in new tab menu. Ordinary clicks keep the existing unsaved-edit checks. A new tab opens the saved destination; it does not copy unsaved edits from the old tab.

Board tools separate Outfit actions from Design tools. Collage mode switches, collage layout-family changes, and Arrange pieces ask before replacing the current presentation. Undo design restores the last major design change, including style, window replacement, crop/cut resets, and straightening; Undo arrange and Undo remove remain available for those actions. Recovery asks before replacing later design edits and never rewrites the outfit name or saved identity. Piece palette edits are identified as wardrobe-wide color changes and offer Undo.
