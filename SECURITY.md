# Security

Closet Lint 0.1 is being prepared. This is currently a single-user application for local use, with optional access on a trusted LAN. It has no user accounts at this time. The served page receives its own request token; that token protects against cross-site requests, not other people who can reach the app.

## Deployment limits

- Default: bind to loopback on your own computer.
- Optional LAN: everyone who can reach the selected address can read and edit that wardrobe. Use only a trusted network and one editing device at a time.
- Private internet hosting needs an authenticated HTTPS reverse proxy and deployment-specific review. It is not part of the initial supported setup.
- A public demo must use separate synthetic data and a verified server-side read-only or isolated-session design. The local sample is editable, and is not a hardened public demo.

Full backups contain measurements, fit logs, wear history, photos, and other private records. Keep them private. Core storage is not encrypted by the app; use the protections of your operating system. Browser storage contains display preferences and some convenience/draft state; it is not a secure vault. Do not put account credentials or email contents into import files.

Normal photo uploads are rasterized by the browser; the assistant importer re-encodes photos and removes EXIF/GPS metadata. Restored photos and direct API uploads preserve their original bytes and may retain metadata. Do not publish them without a separate privacy and rights review. Background removal keeps originals and does not guarantee anonymization.

## Reporting

Please use **GitHub private vulnerability reporting**, rather than a public issue, for security problems. In this repository, open **Security and quality → Advisories → Report a vulnerability** and submit a private report. See [GitHub’s reporting instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately).

Include the affected version, installation mode, expected and actual behavior, and minimal reproduction steps using synthetic data. Do not attach your full wardrobe, measurements, account credentials, order emails, or private photographs. If the reporting button is unavailable, ask the maintainer to enable private reporting without posting vulnerability details. Ordinary, non-sensitive bugs can use public issues.

## Review status

A code-first review and adversarial synthetic tests were completed on 2026-10-19, with fixes and limitations recorded in [the review report](docs/SECURITY-REVIEW.md). This was AI-assisted, not an independent human audit or a guarantee of security. No live network penetration test or browser security-header check was performed. CI is prepared, but has not run on GitHub yet.

Use current dependency updates, keep backups, and read release notes before upgrading. There is no promised security response SLA or long-term support policy yet.
