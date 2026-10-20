# Code-first security review — 2026-10-19

Status: initial review completed, with fixes and synthetic regression tests. This is an AI-assisted code review, not an independent audit, live penetration test, or guarantee of security. No browser or personal wardrobe writes were used.

## Scope and trust boundaries

Reviewed the Python HTTP/storage service, backup/restore validation, optional background-removal worker boundary, assistant importer, browser storage adapter, HTML/DOM insertion sites, product links, image ingestion, source packaging, and dependency declarations.

The supported deployment is one personal wardrobe on loopback, optionally on an explicitly trusted LAN. There are no accounts or signed-out users. Anyone who can reach the password-free service can access that wardrobe. Its request token helps prevent cross-site requests; it is not authentication. Private internet hosting and a shared public demo require separate access-control/deployment work before deployment.

The local assistant importer accepts prepared files and metadata. It does not fetch remote URLs, scrape stores, connect to email, execute imported text, or send data to an AI provider. Its authorized local-file boundary is the manifest folder. The optional worker launches a locally configured interpreter with an argument array, not a shell command. That configuration is trusted local installation data, not an HTTP setting.

## Findings fixed

| Finding | Boundary and impact | Change and evidence |
| --- | --- | --- |
| Stored SVG attribute injection | Board frame colors from a crafted backup could enter generated SVG markup through `innerHTML`. | Frame colors now accept supported hex values only. Real-renderer tests supply an attribute-breaking payload in both frame branches and verify it cannot introduce elements or handlers. |
| Broad inline-script permission | The local server previously allowed arbitrary inline scripts and event handlers through CSP. | Script policy now hashes exact served inline blocks, including per-instance bootstrap data. It keeps self-hosted runtime.js and blocks arbitrary inline handlers/eval. Tests compute hashes from served output. Style inline permission remains for the existing styling system. |
| Unsafe/malformed JSON accepted | Restored dictionaries and API records could carry prototype-sensitive keys, excessive nesting, or invalid common garment fields. | Reject duplicate/unsafe keys, non-finite values, excessive complexity/depth, unsupported backup versions, invalid board pieces, malformed photo lists, and common piece-field types before writes. Legacy string tags remain supported and are normalized before color migration. Existing-record preservation is tested. |
| Weak image/bundle validation | Signature-only detection and arbitrary `data:image/` bundle content admitted unsupported content and huge declared dimensions. | Validate raster header dimensions, enforce 40 megapixels/20,000px per edge, restrict bundle images to validated JPEG/PNG/GIF/WebP data, and reject SVG. Browser uploads reject unsupported MIME types and oversized files, then rasterize/cap to 1600px. Assistant import re-encodes and strips EXIF/GPS. |
| Restore/resource growth | Large compressed uploads were read into RAM in one operation; preview files and server request threads had no count bound. | Restore uploads stream in 1 MB chunks. Keep at most two previews, with expiry checked on mutations. HTTP service limits concurrent workers to eight and socket idle waits to 30 seconds. Duplicate lengths and transfer encodings are rejected. Tests cover preview eviction and connection-slot release after failure. |
| Backup path ambiguity | ZIP symlinks and escaping legacy-folder symlinks were not explicitly rejected. | Reject ZIP symlinks and legacy metadata/photo paths outside the selected folder. Existing filename allowlists, expanded-size limits, CRC checks, and transactional restore/recovery remain. |
| Optional worker output growth | Captured subprocess logs and an oversized output file could allocate avoidable memory. | Discard worker stdout/stderr and check output file size before reading; retain the 120-second timeout, original-photo preservation, and serialized processing. |
| Known-advisory decoder baseline | Existing Pillow 12.1.1 has published advisories; resolving latest requirements alone missed this installed/minimum-version gap. | Raised Pillow minimum to 12.3.0 in both optional environments, check the version before decoding, and restrict decoders to supported raster formats. Existing installations need an explicit environment update. |
| Dependency/release hygiene | No lockfile or automated public-source/security workflow. | Added npm lockfile, expanded ignores, optional background-removal requirements file, source-boundary checker, least-privilege CI with pinned action revisions, dependency audits, verified Gitleaks, and dependency update configuration. CI is prepared but has not run on GitHub. |

External product links already used http(s) checks and `noopener noreferrer`; credential-bearing links are now rejected too. Imported titles and descriptions use text nodes. Remaining `innerHTML` sites were traced to constant UI markup or generated numeric geometry; the discovered color interpolation is fixed. No eval/new Function use was found in the reviewed app code.

## Checks and evidence

- Full dependency-free JavaScript suite, including hostile SVG color/link checks, and synthetic Python storage/import/security suites. See [TESTING.md](TESTING.md) for repeatable commands and verification limits.
- Adversarial tests for poisoned keys, malformed field types, nested JSON, non-finite numbers, future format versions, oversized image headers, SVG bundles, ZIP symlinks, archive size bounds, malformed restore confirmations, preview eviction, HTTP length ambiguity, CSP hashes, and bounded server worker behavior.
- Existing round-trip, rollback, recovery, cross-origin/Host/token rejection, import idempotency, photo preservation, and source/sample tests remain in the suite.
- `npm audit`: zero known vulnerabilities in the resolved, locked development dependency graph at review time. This is advisory coverage, not proof of safety.
- Verified official Gitleaks v8.30.1 download against its published SHA-256; directory scan of the allowlisted public-source tree found zero secrets. The source directory has no Git repository/history yet, so there was no historical scan to perform. CI is configured to scan complete history once it exists.
- Public-source boundary check found empty catalog/tags/bundles/public-snapshot blocks and no built-in credential/machine-path pattern matches. Only project artwork and fictional AI-generated sample photos are included; no personal or retailer wardrobe photos are shipped.

pip-audit found zero known advisories in the 29-package resolved optional graph (Pillow 12.3.0, Rembg 2.0.85, ONNX Runtime 1.31.0). A separate exact-version check found advisories on the previous Pillow 12.1.1 baseline; it is now rejected by the photo tools. Existing environments were not automatically upgraded. No Semgrep/ESLint scan, independent human review, actual HTTP socket test, browser CSP test, or public hosting header scan was performed. HTTP tests exercise real handlers with in-memory connections; deployment behavior still needs its own checkpoint.

## Explicit limitations and follow-up gates

- Source can include measurement, fit-log, price, wear-history, and lingerie features. Personal records must be absent from the source/demo. Removing functionality does not substitute for dataset separation. A future curated public export needs an explicit field allowlist, clean product URLs, photo metadata/background review, and rights review. The fictional sample avoids that blocker for the first commit.
- The local sample is intentionally editable. It is not a read-only public demo. Do not expose this service directly on the public internet. No authentication, TLS termination, multi-user isolation, or hardened reverse-proxy configuration was added in this review.
- Core image validation is structural/header-based, not a complete image decoder or malware scanner. Restored assets and direct API uploads preserve their bytes, including potential metadata. Normal UI/assistant ingestion re-encodes; public exports need independent privacy checks. Animated files, decoder vulnerabilities, OS resource exhaustion, disk quotas, and total wardrobe growth are not comprehensively sandboxed.
- Worker timeout/thread limits do not impose an OS memory limit on ONNX or Pillow. Models and optional dependencies are downloaded at setup; weights are not redistributed in source. A container/OS resource boundary and offline/model checksum guarantees would be additional work.
- Browser storage is origin-scoped convenience/draft storage, not encrypted storage. Local databases/backups rely on OS permissions and device security. External Google Fonts requests remain documented; the app is not advertised as making zero network requests.
- Schema checks cover common fields and unsafe shapes, not a formally complete schema for every profile/trip/outfit setting. Further fuzzing and independent review are useful.
- Tokens/cross-site protections do not prevent an authorized LAN client from editing data or filling its disk. One trusted editing device at a time remains the supported model.
- Code and Linty artwork are now GPL-3.0-or-later. GitHub private vulnerability reporting is the chosen route; enable it on the actual repository before publication. Publish a factual review status, not a “security certified” claim. Decide whether an independent review is a release requirement; another AI review is useful, but is not a human audit.

## References

- [OWASP secure code review](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html)
- [OWASP file upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
