# Experimental SiteGround adapter

This adapter keeps the existing Python storage and HTTP handlers behind a single
Node listener. Python uses private pipes; it does not open another listening port.
This is an experimental deployment adapter, not a generally supported hosting
option or a managed-hosting service.

See [private hosting](../../docs/HOSTING.md) for setup, password protection,
backups, update rehearsal, and known limits. SiteGround support explicitly says
Python child processes are unsupported on its Node hosting. The tested
installation is therefore outside its supported configuration. Confirm provider
compatibility before choosing this adapter.

Build an allowlisted package with `python3 deploy/siteground/build_package.py --out PATH.zip`.
The package includes app source and tools, but no wardrobe, database, photo
environment, model, credentials, or local settings. Existing ZIPs are not overwritten.

Use Node 22 or newer, the generated `npm run build` command, and `npm start`.
Set `CLOSETLINT_ORIGIN` to the exact public HTTPS origin. Keep `CLOSETLINT_DATA`
outside the source and `public_html`; if omitted, the adapter uses the site's
private sibling `closetlint-data` folder. Changing domains requires updating the
origin and verifying the private folder and records again.

Protect `/` with SiteGround's Protected URLs before transferring a personal
wardrobe. Verify protection on the app, API, photo URLs, and backups, and verify
alternate hostnames cannot bypass it. The app's request token is not a login
password. Confirm private responses are not cached. Set the password directly in SiteGround.

Direct import commands and photo request paths belong to the hosting server.
Use explicitly approved SSH access, or choose the browser's ZIP import and photo
result workflows. Do not run remote paths against a local wardrobe. Optional
photo packages and their verified model must be installed separately in private
storage. The standard photo installer currently targets Python 3.11–3.13; a
different hosted interpreter needs explicit package/import and real-image checks.

Before migration, use test pieces to check file import, direct import,
duplicates/retries, photo-only updates, background removal, backup/restore,
phone layouts, and update persistence. Keep the existing installation as the
main wardrobe until these checks pass. Then pause edits, take a fresh full
backup, restore it on the host, and verify the records and photos before
switching. Keep the original installation and backup for recovery.
