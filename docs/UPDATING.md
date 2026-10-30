# Updating and moving your wardrobe

Updates are manual. For a hosted installation, follow the [hosted update and rollback checklist](HOSTING.md#manual-update-and-rollback-checklist).

## Update on your computer

1. Save open edits, finish or download unfinished import and photo work, and choose **Utilities → Export backup**. Keep the backup and your current app folder.
2. Stop the server with **Ctrl+C**.
3. Unzip the new app into a separate folder. Keep your wardrobe data folder unchanged; do not replace it with app files.
4. Start the new app using the same `--data` path as before. You do not need to import your pieces again.
5. Refresh open tabs on all devices, check your pieces and photos, and try a backup download.

Run only one server for each wardrobe. If you move the app folder, check that `--data` still points to the right place; using the full path avoids confusion.

## If you need to go back

Keep the previous app and its pre-update backup together. Older versions may not read newer data correctly.

Save a separate backup of any work done since the update. Stop the new app, start the previous version with a new, empty data folder, and restore the pre-update backup through **Utilities → Restore full backup**. Check the destination before confirming. Changes made after the update remain in the separate backup; they are not automatically merged into the restored wardrobe.

## Move to another computer

Install the app on the new computer, start it with a new data folder, and restore your full backup. Verify your pieces, photos, and other saved records before removing the original copy.

Set up browser display preferences and optional photo tools again; these are not included in the wardrobe backup. For moving to a host, follow the checks in the [hosting notes](HOSTING.md) before switching to that copy.
