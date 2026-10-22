# Bookmarks and browser navigation

Open a piece, saved outfit, collection, or saved trip, then bookmark the address or copy it from your browser. Main views also have addresses. Links use `#` routes, so they work with the basic local server without special hosting rules.

Examples, after your usual app address:

| Address | Opens |
| --- | --- |
| `/#/closet` | Closet |
| `/#/pieces/PIECE_ID` | Piece view |
| `/#/board` | Your working board |
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

A saved outfit opens separately from your working board. Opening a piece from that outfit does not discard its unsaved edits. Leaving an edited outfit, trip, piece form, or collection form asks before discarding changes. Cancel keeps the current view and address. Refreshing or closing a page with unsaved edits uses the browser's standard warning.

Accepted discard removes unsaved edits; it does not delete previously saved items. The working board remains separate and uses its existing automatic persistence. An unsaved trip's `/#/trips/new` address starts a new trip after a fresh load; it cannot restore an unsaved draft.

## These links belong to an installation

A bookmark opens the wardrobe served at that app address. It does not upload anything, grant sharing permissions, or copy data to another installation. URLs and history contain navigation state, not photos, measurements, or working-board contents.

For a phone on your trusted network, use the laptop's working LAN address, rather than `localhost`: on the phone, `localhost` means the phone itself. The route after `#` stays the same. If the laptop's LAN address changes, update the bookmark's host address.

## Opening another tab

Main navigation, piece photos and titles, saved outfit previews and titles, collection browse links, and saved-trip links support Ctrl-click, Command-click, middle-click, and the browser’s Open link in new tab menu. Ordinary clicks keep the existing unsaved-edit checks. A new tab opens the saved destination; it does not copy unsaved edits from the old tab.
