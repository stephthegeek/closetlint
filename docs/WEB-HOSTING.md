# Put your private, hosted closet online

Web hosting lets you use the same wardrobe from different devices without leaving a home computer running or opening ports on your router. The host stores the wardrobe and photos.

**Hosting is experimental.** These notes are for someone comfortable with a hosting dashboard and SSH. They are not a complete guide for every provider. Local installation still needs only Python and a browser.

## Requirements

Before purchasing hosting or transferring data, confirm:

- Python 3.10+, SQLite, and permission to run the application. The current adapter also needs Node 22+ and permission to start Python from Node.
- Private, persistent storage outside the deployed app and public web folder.
- HTTPS and password protection covering the app, API, photos, and backups, including alternate hostnames.
- SSH or another private maintenance route for backups and recovery.
- Enough disk, memory, and processing time for photos, backups, and a separate restore copy. Check upload limits and scheduled task support.

This is one shared wardrobe, not separate user accounts. Anyone who can enter the protected site can view and edit it. The app’s request token is not a login password.

## What has been checked

A SiteGround test installation has been checked for saving, imports, photos, password protection, restart recovery, backups, updates, and rollback. Other providers remain untested. See [testing](../CONTRIBUTING.md#testing) for the recorded scope.

**SiteGround limitation:** its support team says Python child processes are unsupported on Node hosting. The current adapter uses that arrangement, so a working installation does not establish provider support. Confirm compatibility before choosing a host.

## Install and test before moving a wardrobe

These steps use the current adapter in `deploy/siteground`. Use a separate test installation first.

1. Build a data-free package from the source:

   ```bash
   python3 deploy/siteground/build_package.py --out /private/path/closetlint-hosted.zip
   ```

   Replace the output path with a private folder you can write to. Keep the ZIP and its printed checksum.
2. Follow your host’s deployment instructions. For this adapter, use Node 22+, `npm run build`, and `npm start`. No separate database service is needed.
3. Set the application settings, using your actual paths:

   | Setting | Value |
   | --- | --- |
   | `CLOSETLINT_ORIGIN` | Exact HTTPS origin, such as `https://closet.example.com` |
   | `CLOSETLINT_DATA` | Private persistent wardrobe folder outside the deployed app and public web root |
   | `CLOSETLINT_PYTHON` | Python executable, if `python3` is unsuitable |

   The host supplies `PORT`. Keep these settings for later updates.
4. Enable HTTPS and site-wide password protection before adding private data. On SiteGround, use **Site Tools → Security → Protected URLs** for `/`. Check signed-out access to the app, API, a photo, and backup download. Repeat for temporary or alternate hostnames. Private responses must not be cached publicly.
5. Add test pieces and try the features you need. Check saving, photos, imports, a restart, recovery after idle, and a deployment. Optional photo tools need separate setup on the server; see [photos](USING-CLOSET-LINT.md#photos).
6. Export a full backup and restore it into a separate test wardrobe. Verify records, board contents, and photos. Test rollback too.
7. When ready to move, save open work, pause edits in the old closet, and take a fresh full backup. Transfer it and verify the hosted copy before switching. Keep the original copy and backup for recovery. Separate installations do not synchronize.

## Backups and large wardrobes

Use **Menu → Utilities → Export backup** and keep a copy outside the hosting account. Keep the corresponding app package too. Scheduled backups and off-host copies require separate setup; confirm they succeed and test restoring one.

A private command-line export is available from the installed app folder:

```bash
python3 runtime/server.py --data /private/closet-data \
  --export-backup /private/backups/before-update.zip --prepare-only
```

Use your actual paths and a new backup filename. The destination directory must exist. Do not copy a live SQLite database with a plain file copy; use the app’s export or a consistent database backup.

The app limits full backup archives to 512 MiB and individual uploaded photos to 32 MiB. Your host may impose lower limits. If browser restore is too large, use private file transfer and the matching app’s restore tools to prepare a new data folder. Verify it before switching the stopped app. Never publish a backup to work around an upload limit.

Full backups exclude browser-only unfinished work, optional photo tool installations, and separate AI assistant working files. Finish or preserve those separately before moving.

## Updating

Back up, deploy the new code with the same private data folder and hosting settings, then refresh and check saving, photos, and access protection. See the [adapter reference](../deploy/siteground/README.md) for maintenance and recovery details.
