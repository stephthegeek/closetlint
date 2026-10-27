# Updating, moving, and rolling back

Before updating, save open edits and download **Utilities → Export backup**. Keep that ZIP and your previous app folder until you have checked the update.

1. Stop the server with Ctrl+C.
2. Extract the new source into a new app folder. Keep your wardrobe data in its existing, separate folder; never replace that folder with source files.
3. Start the new version with the same absolute `--data` path. Relative paths are resolved from the terminal's current folder, so check them carefully when moving the source.
4. Open the printed address, check your pieces and photos, and try a full backup.

Only one server should access a wardrobe at a time. Browser tabs may cache old code; refresh after the server restarts. Display preferences belong to the browser/origin and are not a substitute for a wardrobe backup.

## Updating from 0.2 to 0.3

Use the same separate wardrobe data folder and the steps above. Sky and the daily fortune do not require reimporting pieces. Resolve failed saves before stopping the old version. Ordinary outfit and partial wear-log retries need the current tab to remain open. Dated Save & schedule retains its reserved save identity across reloads, and direct-import receipts retain their saved results. These recovery paths do not replace a full backup. The extracted 0.3.0-rc.2 candidate passed a synthetic 0.2 update and full-backup restore on Linux, including records, board, plans, wear history, and photo bytes; see [testing](TESTING.md) for the evidence and limits.

## Updating from 0.1 to 0.2

Keep using your existing wardrobe data folder; an ordinary app update does not require importing your pieces again. A synthetic 0.1 wardrobe was opened with the extracted 0.2 candidate without changes to its catalog, collections, board, or photos. Keep your pre-update backup, and check your own wardrobe after restarting. See the published 0.2 release for its historical release notes.

## Rollback limits

There is no tested general cross-version downgrade guarantee yet. Keeping the same data folder while relocating the same build is different from proving that a future database migration is reversible. Until release-specific migration instructions say otherwise, restore your pre-update backup into a separate data folder and run the previous app against that restored copy. Do not overwrite newer work by guessing that an older app can read an updated database.

Restore from **Utilities → Restore full backup**, review the counts, and explicitly confirm replacement. The local service keeps a recovery snapshot before replacing a nonempty destination, but a separate backup is still necessary.

## Moving computers

Install the app on the destination, start it with a new data folder, and restore the full backup. Photos and cutout/source relationships are included. Browser display preferences and the optional background-removal installation are machine-specific and need setting up separately. Never import a machine configuration file from an untrusted wardrobe bundle.
