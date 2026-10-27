# Closet Lint 0.3.0

**Your wardrobe has a Sky, and Linty has a daily fortune.**

## Highlights

- **Your Style Sky.** Explore the styles in your wardrobe through stars, constellations, and your Sun, Moon, and Rising signs, then export a shareable chart.
- **Linty’s daily fortune card.** A daily reading, clothing nudge, or color omen, with the option to dismiss it or turn it off.
- **Easier assistant imports.** Save directly with local Codex or Claude Code, or review an import file from a chat conversation. Shared uploads, richer tagging, optional multipack splitting, and individual product photos work across both routes, with clear fallbacks when image editing is unavailable.
- **Laundry and care.** Manually track pieces that need cleaning, keep them out of suggestions, and save care instructions and label photos. Bulk changes support Undo; wear logging never changes cleaning status.
- **Safer outfit planning.** Preview saved outfits without replacing your board, recover drafts, and create an outfit for a calendar date with Save & schedule. Clearer save errors and retries help protect unfinished work.
- **More useful wishlist evidence.** Keep your own ranking order, with compatibility and narrower similarity checks supported by favorites, Lab ratings, and recorded wear.

## Other improvements

Faster browsing and photo lookups, more consistent mobile layouts and controls, clearer size filters, and easier collection actions. Shuffle your pieces, remove a background from the board, and find photo choices together under Photo options.

## Updating from 0.2

Save open edits, export a full backup, stop the old server, and extract this version into a new app folder. Start it with the same absolute wardrobe `--data` path, then refresh the browser. Run only one server against a wardrobe at a time. No piece reimport is needed. Keep the backup and previous app folder until you have checked the update. See [the update guide](UPDATING.md).

## Requirements and verification

The core app needs Python 3.10 or newer and a web browser. No account or AI subscription is required; optional photo tools have separate dependencies.

This candidate is still under review. Automated development checks use synthetic wardrobes on Linux; they do not establish Windows or macOS installation, physical-phone acceptance, or an independent security review. See [testing](TESTING.md) and [security review](SECURITY-REVIEW.md).

The local app has no login. Keep it on your computer or a trusted home network, and do not expose its port to the public internet.
