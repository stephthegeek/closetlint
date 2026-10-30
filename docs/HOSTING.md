# Put your private, hosted closet online

Web hosting lets you use the same wardrobe from your phone and computer without leaving a home computer running or setting up port forwarding on your home router. The host stores the wardrobe and photos. Updates remain manual.

**Status: early hosting notes, with one working SiteGround installation.** These notes describe an experimental setup for someone comfortable with a hosting dashboard and occasional SSH commands. They are not yet a complete installation guide, and ordinary shared hosting may not meet the requirements. Local installation remains available with Python alone; it does not require Node.

## Requirements to confirm before moving data

- A plan that permits the chosen application process, with Python 3.10+ and SQLite available. The current experimental adapter also needs Node 22+ and permission to start Python from Node.
- Persistent private storage outside the deployed app and public web root. Redeploying or restarting must preserve it.
- HTTPS, password protection for **every** app route, and a way to protect or disable temporary and alternate hostnames.
- SSH or an equivalent private file-management route for large backups, maintenance, and recovery.
- Enough disk for the live database, retained backups, a restore copy, and temporary processing. Backups contain photos and can be approximately the size of the wardrobe itself. Check disk and memory quotas, cron limits, request timeouts, and upload limits before committing.

This is a single-owner installation. The app's request token prevents certain unwanted requests; it is **not** a login password. Anyone who can enter the protected site can use that wardrobe. Do not expose `runtime/server.py` directly to the internet as a substitute for the protected hosting adapter.

## What has been checked

Checks on a SiteGround installation covered HTTPS, password protection, file and direct imports, photo updates, optional photo processing, saved data after restarts, and full backup and restore. Signed-out requests to the app, API, photos, backups, and temporary hostname were denied. Daily backups and a separate copy on another computer ran successfully; a restore check compared saved records and verified every photo’s contents.

**Provider limitation:** SiteGround support explicitly says Python child processes are unsupported on its Node hosting. The current adapter starts Python from the Node web server, so this working installation is outside that supported configuration. Earlier deployments also needed support to restart the running app. Passing tests do not establish provider support, and a successful build does not by itself confirm that the new version is running. Confirm compatibility before purchasing hosting. Other providers still need testing.

## Install and test before transferring a wardrobe

The general sequence is to set up a separate test app, protect access, check saving and recovery, and then transfer your wardrobe. The commands below use the existing experimental Node/Python adapter in `deploy/siteground`; they are not a tested recipe for every provider. Confirm that your host permits this setup first.

1. Build an app package without wardrobe data from a reviewed copy of the source:

   ```bash
   python3 deploy/siteground/build_package.py --out /private/path/closetlint-hosted.zip
   ```

   Keep this ZIP and its printed SHA-256 checksum, which identifies the package. It contains no wardrobe data, passwords, or optional photo tools and models.
2. Create a separate test app using your provider’s deployment instructions. For the current adapter, upload the ZIP, select Node 22+, use `npm run build` as the build command, and use `npm start` to start the app. No separate database service is required; Closet Lint uses SQLite.
3. Set these environment variables, using your own absolute paths:

   | Setting | Value |
   | --- | --- |
   | `CLOSETLINT_ORIGIN` | Exact HTTPS origin, such as `https://closet.example.com`, without a path |
   | `CLOSETLINT_DATA` | Private persistent folder outside the app source and public web folder (often called `public_html`) |
   | `CLOSETLINT_PYTHON` | Host's Python executable, if `python3` is not suitable |

   The hosting service supplies `PORT`. Keep a private note of these settings. Do not store passwords in the source package. When changing domains, update the origin and recheck data paths and protection.
4. Enable HTTPS and password protection for the entire site, including `/`, using your provider’s access controls. Set the password directly in the hosting dashboard. On SiteGround, this is **Site Tools → Security → Protected URLs**. In a signed-out browser, check that the app, API, a photo URL, and backups all require a login. Repeat for any temporary or alternate addresses. Confirm that private responses cannot be served from a shared cache; the app’s private/no-store settings must not be overridden by the host.
5. Add only test pieces. Save a trip, an outfit, individual wear dates, and a working board. Try the import and photo tools you plan to use. Restart the app, let the host idle, and check that it comes back with the same records and photos. Test a deployment and rollback before transferring anything important.
6. Download a full backup and restore it into a separate test wardrobe. Compare the saved records and board, and verify that every photo is intact. If you need optional photo tools, install them in private storage using [the photo setup guide](PHOTOS.md), and try processing a photo on the hosted app. Missing optional tools must not block ordinary wardrobe use.
7. Only after these checks, pause edits in the old closet, take a fresh full export, and transfer it. Keep the original installation and export until the hosted copy is verified. Do not edit both copies as if they were synchronized.

## Backups and large wardrobes

Use **Utilities → Export backup** for a complete wardrobe ZIP, and keep a copy outside the hosting account. A host's own backup is useful but is not the only recovery copy. Keep the matching app ZIP as well.

For an SSH export, run this from the installed app folder, with your actual private paths and a new filename each time:

```bash
python3 runtime/server.py --data /private/closet-data \
  --export-backup /private/backups/before-update.zip --prepare-only
```

This takes a consistent export without opening another server, and refuses to overwrite an existing ZIP. The destination directory must already exist. Test the command before scheduling it, and make sure you are notified if a backup fails.

For scheduled backups, use a private cron job that performs the app's consistent export or takes a SQLite online backup and exports it with the matching storage code. Validate the result, and copy the completed backup off-host. Do not copy an actively written SQLite file with a plain file copy. Keep import receipts/source files separately if you need to resume assistant work; optional models and machine configuration are not included in the portable wardrobe ZIP. One tested backup arrangement keeps seven daily and four weekly backup periods, with an hourly copy to another computer that catches up when it is online. Scheduled backups and off-host copies need separate setup; this package does not configure them automatically.

The app currently limits a full backup archive to 512 MiB and an individual uploaded photo to 32 MiB. A provider can impose lower limits: SiteGround rejected an approximately 393 MB browser restore with HTTP 413 even though it was within the app limit. Large restores therefore need a private SSH/file transfer route. Upload the ZIP outside the web root, restore into a **new** private folder using the matching app's `storage.Archive` and `Store.restore`, verify it, and only then switch the stopped app to that folder. Never turn a private backup into a publicly downloadable file to bypass an upload limit.

Restore tests must check content, not just that a ZIP opens. Compare all collections, catalog, board, photo count, every photo's SHA-256, and SQLite integrity. Check the latest backup timestamp and the off-host copy regularly; a cron entry alone does not prove backups succeeded.

## Manual update and rollback checklist

1. Save or download unfinished browser work. Record the current app package, private data path, and hosting settings.
2. Take and verify a pre-update backup, including an off-host copy. Keep the prior app package. Test the new package with data created by an older app version first, using a separate test wardrobe.
3. Deploy source only. Keep the same private data folder and settings. Confirm the new process is actually serving the new package, then refresh saved tabs. Test saves, photos, calendar, backup download, and recovery after idle.
4. If rollback is necessary, pause edits and preserve a backup of any post-update work. Restore the pre-update backup into another private folder, stop the new app, and start the previous package against that restored folder. Refresh tabs and verify again. Post-update edits are retained in their separate backup; they are not automatically merged into the restored closet.

Do not assume a newer database or format-2 backup is readable by 0.2. That version uses format 1. See [updating](UPDATING.md) for version-specific behavior.

## Advanced: testing an update and rollback

The included test command creates its own test wardrobe and requires a new work folder, so it cannot replace an existing one. Supply extracted packages from trusted sources: the 0.2 source, the previous hosted package, and the new hosted package you want to test.

```bash
python3 deploy/siteground/rehearse_update.py \
  --old-source /private/test/v0.2.0 \
  --previous-hosted /private/test/previous \
  --candidate /private/test/candidate \
  --work /private/test/new-rehearsal \
  --large-mib 420
```

This starts temporary local servers and saves a report, test backups, and separate restored folders. Allow several GiB of temporary disk space. On the actual host, `--transport pipe` exercises its Python runtime and storage without opening another web listener. That mode does **not** test Node routing, password protection, the public proxy's upload limits, or the host’s behavior after deployments and idle periods. Check those separately on a hosted test app, including from a signed-out browser. A passing update test does not cover them.
