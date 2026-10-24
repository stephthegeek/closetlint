# Runtime and storage

Closet Lint uses a Python HTTP service with SQLite storage and a plain HTML, CSS, and JavaScript frontend. Python 3.10 or newer is required. Running the app needs no frontend build or additional Python packages; optional photo tools have separate dependencies.

For startup commands, the sample collection, and phone access, see [INSTALL.md](INSTALL.md).

## Data folder

Pass a writable folder outside the source tree with `--data`. It holds `wardrobe.sqlite3`, photo data, recovery snapshots, and temporary restore uploads. Keep it private and backed up. Source updates must not replace it.

The database stores document collections, image blobs, the base catalog, and the working board. A new empty wardrobe opens the setup wizard. Browser display preferences remain separate.

## Service boundary

The service binds to loopback by default. `--lan-ip` enables an explicitly selected address on a trusted network. There are no accounts: anyone who can reach the page can view and edit that wardrobe. Use one editing device at a time; whole-record writes do not merge concurrent edits.

`runtime/server.py` serves the app, adapter, API routes, and ID-addressed photos. It does not serve arbitrary files or directory listings. Host and origin checks reject unexpected browser requests, and API calls require the token delivered with the app page. That token protects against cross-site requests; it is not user authentication. See [SECURITY.md](../SECURITY.md).

`runtime/browser.js` supplies collection listeners, serialized writes, uploads, and downloads. Failed writes remain visible as failures. Preserve unsaved work before refreshing after a storage error.

## Backup and restore

A full backup ZIP includes all document collections, the base catalog and tags, stored photos, and the working board. It excludes browser display preferences, disposable photo caches, and the optional photo-processing environment.

Restore previews do not change the wardrobe. Applying a full restore validates references, file types, and archive integrity, then replaces the destination inside one database transaction. An existing wardrobe gets a recovery snapshot under `DATA/recovery/` before replacement. These SQLite snapshots are private recovery files, not ZIPs for the restore dialog.

Board autosaves pause during restoration. Pending writes must finish successfully before a backup can complete. Backups use a consistent read transaction. Keep a separate backup even when recovery snapshots exist.

An offline export is available with the server stopped:

```bash
python3 runtime/server.py --data /path/to/wardrobe \
  --export-backup /path/to/new-backup.zip --prepare-only
```

The destination filename must be new. See [UPDATING.md](UPDATING.md) for moving computers and rollback limits.

## Optional photo tools and imports

The supported [assistant importer](ASSISTANT-IMPORT.md) adds validated pieces and local photos without replacing the wardrobe. The app itself does not read email or scrape retailers.

Assistant photo imports and [local background removal](PHOTOS.md) share an optional environment on the server computer, configured by `tools/setup_photos.py`. The import CLI automatically delegates to that environment. `tools/check_setup.py` probes the configured interpreter and packages without installing software or changing wardrobe records. Existing `background-removal.json` configurations remain supported; shared setup uses `photo-tools.json` and reuses a compatible existing environment. A phone uses the same server tool. Models and dependencies are installed separately; originals and accepted results remain in the wardrobe backup. Environment configuration and installed packages are machine-specific and are recreated after moving computers.

## Operational limits

- This server does not provide TLS, accounts, public sharing, or multi-user isolation. Do not expose it directly to the internet.
- Allow free disk space for the active database, a restore upload, and a recovery copy.
- With the service stopped, abandoned ZIP files under `DATA/staging/` can be removed. Keep recovery snapshots until you are sure they are no longer needed.
- Databases and backups rely on operating-system permissions and device security; the app does not encrypt them.
- A raw HTML file has no writable local runtime. Use the server’s address.

Developer checks and remaining verification are documented in [TESTING.md](TESTING.md).
