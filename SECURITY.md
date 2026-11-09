# Security

Closet Lint is a single-user application for use on your computer, with optional access over a home network you trust. It has no user accounts at this time. The served page receives its own request token; that token protects against cross-site requests, not other people who can reach the app.

## Protect your installation and backups

- Use the local server on your computer or a trusted home network. Anyone who can reach an unprotected installation can view and edit it.
- Private internet hosting requires HTTPS, site-wide password protection, and a compatible host. See the [experimental hosting notes](docs/WEB-HOSTING.md).
- Public demos use separate static exports. Visitor changes stay in their own browser; the editable local sample server is not a public demo.
- Keep backups private. They can contain measurements, wear history, photos, and other personal records. The app does not encrypt its database or backups; protect the device or hosting account that stores them.
- Save before switching devices. If an older tab refuses a save, preserve its unfinished work before refreshing.

Do not put credentials, payment details, or raw email contents into import files. Review what you share with an AI assistant or publish. Photos from backups or other sources may retain metadata; background removal does not guarantee anonymity.

City suggestions and weather lookup can contact Open-Meteo. City search sends the typed city or destination. Almanac forecasts send location coordinates; trip weather averages also use a generic historical date range. Wardrobe records and actual travel dates are not sent. You can leave the Almanac city blank or enter trip weather manually. See [third-party services](docs/THIRD-PARTY.md).

## Reporting

Please use [**GitHub private vulnerability reporting**](https://github.com/stephthegeek/closetlint/security/advisories/new), rather than a public issue, for security problems. In this repository, open **Security and quality → Advisories → Report a vulnerability** and submit a private report. See [GitHub’s reporting instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately).

Include the affected version, installation mode, expected and actual behavior, and minimal reproduction steps using synthetic data. Do not attach your full wardrobe, measurements, account credentials, order emails, or private photographs. If the reporting button is unavailable, ask the maintainer to enable private reporting without posting vulnerability details. Ordinary, non-sensitive bugs can use public issues.

## Review status

Automated and AI-assisted reviews are recorded in [testing](CONTRIBUTING.md#testing) and the [security review](docs/archive/DEVELOPMENT-RECORDS.md#security-review-records), including their scope and limits. There has not been an independent human security audit.

Use current dependency updates, keep backups, and read release notes before upgrading. There is no promised security response SLA or long-term support policy yet.
