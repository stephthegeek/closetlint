# Security

Closet Lint is a single-user application for use on your computer, with optional access over a home network you trust. It has no user accounts at this time. The served page receives its own request token; that token protects against cross-site requests, not other people who can reach the app.

## Deployment limits

- Default: bind to loopback on your own computer.
- Optional LAN: everyone who can reach the selected address can read and edit that wardrobe. Use only a trusted network and one editing device at a time.
- Private internet hosting needs an authenticated HTTPS reverse proxy and deployment-specific review. It is not part of the initial supported setup.
- The public demo exporter builds static files from an explicitly reviewed collection. It copies only selected fields and approved, re-encoded photos. Demo edits stay in each visitor’s browser. The local sample server is editable and must not be exposed as a public demo.

Full backups contain measurements, fit logs, wear history, photos, and other private records. Keep them private. Core storage is not encrypted by the app; use the protections of your operating system. Browser storage contains display preferences and some convenience/draft state; it is not a secure vault. Photos may remain in the browser's private HTTP cache and are checked with the local server before reuse. Individual catalog-photo copies and optional generated previews remain in the private data folder’s `cache` directory; full backups exclude these disposable caches. Do not put account credentials or email contents into import files.

Normal photo uploads are rasterized by the browser; the assistant importer re-encodes photos and removes EXIF/GPS metadata. Restored photos and direct API uploads preserve their original bytes and may retain metadata. Do not publish them without a separate privacy and rights review. Background removal keeps originals and does not guarantee anonymization.

Trips can request online city suggestions and seasonal weather from Open-Meteo. City search sends the typed destination; weather sends selected coordinates and a generic historical date range. Wardrobe records and actual travel dates are not sent. The local runtime limits these to fixed upstream services and requires the page’s request token. Manual destination and weather entry remain available. See [third-party services](docs/THIRD-PARTY.md).

## Reporting

Please use [**GitHub private vulnerability reporting**](https://github.com/stephthegeek/closetlint/security/advisories/new), rather than a public issue, for security problems. In this repository, open **Security and quality → Advisories → Report a vulnerability** and submit a private report. See [GitHub’s reporting instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately).

Include the affected version, installation mode, expected and actual behavior, and minimal reproduction steps using synthetic data. Do not attach your full wardrobe, measurements, account credentials, order emails, or private photographs. If the reporting button is unavailable, ask the maintainer to enable private reporting without posting vulnerability details. Ordinary, non-sensitive bugs can use public issues.

## Review status

The 0.1 candidate has passed automated source and security checks, dependency advisory checks, full-history secret scanning, and a local installation and backup/restore rehearsal. The code review was AI-assisted; there has not been an independent human audit, penetration test, or independent hosting-header audit. See [the review report](docs/SECURITY-REVIEW.md) and [testing notes](docs/TESTING.md) for scope and limits.

Use current dependency updates, keep backups, and read release notes before upgrading. There is no promised security response SLA or long-term support policy yet.
