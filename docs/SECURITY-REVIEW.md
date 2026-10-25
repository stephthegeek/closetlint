# Security review for 0.2 ZIP imports

The additional **AI-assisted implementation review is complete** for code commit `1a637c9216f6ffd709196a5a3e972ea6884a207c`, tree `9a61fe7b8812ea03150bf4b9d7dc2b1b160a7dc0`. No blocking findings remain from the reviewed scope. This is not an independent human audit, penetration test, or guarantee of security. Owner device acceptance and publication approval are separate release gates.

Later 0.2.0 preparation also changes board autosave recovery, saved-outfit identity and navigation, and HTTP connection handling. These are implementation changes, not metadata-only preparation. The ZIP parser, import behavior, importer, and storage implementation remain unchanged from the reviewed commit. A 25 October follow-up adds website terms, permission, and responsibility guidance to three browser-assistance descriptions; removing those three copy additions reproduces the reviewed setup module exactly. The affected board, navigation, runtime, connection, and security checks have been rerun; the full current Linux suite passes 94 Python tests and the JavaScript suite. Temporary photo diagnostics and experimental delivery switches are excluded. Final package hashes and exact-commit CI results are recorded separately with the release evidence.

## Scope and resolved findings

Reviewed the browser ZIP parser and JSON/photo handoff as untrusted input: local and central headers, offsets and ranges, malformed/truncated data, CRCs, duplicate/ambiguous names, unsafe paths, links, encryption, unsupported formats/flags, expansion limits, cancellation, text rendering, temporary Blob URLs, review-before-save, retry integrity, and separation from full-backup restore.

The review found and fixed missing explicit overlap rejection, missing active cancellation/total elapsed-time bounds, and insufficient local-header/data-descriptor consistency checks. The parser now rejects overlapping local-entry ranges, checks local sizes and CRCs against the directory, validates streaming data descriptors, and applies a 30-second elapsed-time budget across awaited reads. Closing the import or replacing its file aborts loading. Existing session photo URLs are revoked on errors, cancellation, replacement, and close. PNG detection checks the complete eight-byte signature.

## Verification

- Adversarial tests cover stored/Deflate archives, CRC failures, header disagreement, overlapping entries, descriptor success/failure, unsafe and ambiguous names, unsupported image/file types, symlinks, encryption, declared limits, false expansion sizes, missing native decompression, elapsed-time limits, and object-URL cleanup. Additional extracted-parser checks cover cancellation during active inflate, cleanup after late cancellation, 200 malformed buffers, and 801-entry rejection.
- Full source and extracted JavaScript suites and all 91 Python tests passed on Linux. Core startup also passed with `python -S`, without optional packages.
- Chrome exercised ZIP load, review, and save with one new wishlist piece and one existing owned update. The existing piece kept its original photo. Native copy/paste worked on the HTTP home-network address.
- The extracted app exported and restored a synthetic full backup, preserving all collections, the working board, and 13 photo hashes, with a recovery copy. Chrome required the owner to select Keep for the download. Active-load cancellation and timeouts were simulated in automated tests rather than forced through the live UI.
- [Exact implementation CI](https://github.com/stephthegeek/closetlint/actions/runs/40119855640) and a [second run](https://github.com/stephthegeek/closetlint/actions/runs/40119860160) passed security/source checks, dependency advisories, full-history secret scanning, and minimum-Python checks. The committed rebuild matched the browser-tested rc4 package byte for byte.

## Remaining limits

Browser operations are bounded but do not form an operating-system memory sandbox. The ZIP input limit is 50 MB, declared expansion is limited to 100 MB, JSON to 1 MB, and each photo to 10 MB. Buffers, Blob storage, and image-decoder allocations add overhead. Image signatures are not full decoder validation; imported photos must pass the existing browser rasterizer before save. This review does not establish a hard memory ceiling or comprehensive browser-engine exploit protection.

Windows/macOS installation, all physical-mobile/browser combinations, and broad assistive-technology coverage remain unverified. Remote image downloads depend on browser and source-site restrictions; bundled ZIP photos avoid that dependency. The local service remains a single-user tool for a trusted computer/home network, with no login. The earlier 0.1 review below records the wider runtime/storage protections and limits that still apply.

---

# Security review for 0.1

This is an AI-assisted code review with automated adversarial tests, not an independent human audit, penetration test, or guarantee of security. The initial review and subsequent fixes cover the candidate prepared for 0.1. Current check results and platform limits are in [TESTING.md](TESTING.md).

## Scope and trust boundaries

Reviewed the Python HTTP/storage service, backup and restore, assistant importer, optional photo worker, browser storage adapter, HTML/DOM insertion, product links, image ingestion, source packaging, and dependencies.

The local service is for one personal wardrobe on your computer, optionally accessible over a home network you trust. There are no accounts: anyone who can reach it can view and edit that wardrobe. Host, origin, and request-token checks defend against cross-site browser requests; they do not authenticate users. Do not expose the service directly to the internet.

The assistant importer reads prepared metadata and image files from an authorized local folder. It does not fetch product URLs, connect to email, execute imported text, or send data to an AI provider. The optional photo worker uses a locally configured interpreter and an argument array, not a shell command. Its configuration is trusted machine setup, not an imported wardrobe setting.

Public static demos are separate exports. They copy selected fields and photos into a snapshot; visitor edits stay in browser storage. The export flow supports a collection/photo review and re-encodes selected photos without source metadata. Publishing a snapshot is a separate privacy and image-rights decision. The editable local sample server is not a public demo server.

## Protections and tested fixes

| Area | Protection |
| --- | --- |
| Imported text and links | Text nodes for titles/descriptions; http(s)-only links without embedded credentials; external links use `noopener noreferrer`. Board SVG frame colors accept supported hex values, closing the reviewed attribute-injection path. |
| Script policy | The local server hashes its exact inline script blocks, including per-instance bootstrap data. Arbitrary inline handlers and eval are not allowed. Inline styles remain permitted for the current interface. |
| JSON and schema validation | Reject unsafe/duplicate keys, non-finite values, excessive nesting/complexity, unsupported versions, malformed common piece fields, invalid board pieces, and malformed photo lists before writes. |
| Backup and restore | Reject escaping paths and ZIP symlinks; bound archive sizes; check references, CRCs, and supported image headers. Preview does not replace data; confirmed restore uses a transaction and retains a recovery snapshot. |
| Resource bounds | Restore uploads stream in chunks. Preview count and lifetime, request size, socket idle time, and concurrent server workers are bounded. Photo processing is serialized with an output-size check and timeout. |
| Photos | Browser uploads restrict formats and rasterize/cap images. Assistant imports re-encode images and remove EXIF/GPS metadata. SVG uploads are rejected. Restored/direct API assets retain their bytes and may retain metadata. |
| Optional worker | Uses direct U²-Net inference through ONNX Runtime, with Pillow 13 or newer. Setup and inference verify the model checksum; original photo pixels are retained behind a new transparency mask. |
| Repository and dependencies | Allowlisted source packaging, empty embedded wardrobe, separate sample data, pinned Actions, locked npm dependencies, advisory checks, and full-history secret scanning. |

Tests cover hostile SVG colors and URLs, poisoned keys, malformed fields/archives, unsupported backup versions, oversized image headers, preview cancellation/expiry, malformed restore confirmations, HTTP length ambiguity, CSP hashes, origin/Host/token rejection, import retries, rollback, and preservation of existing records.

## Verification

The candidate passed GitHub Actions for the JavaScript and Python suites, npm and optional Python dependency advisory checks, public-source boundaries, and full-history Gitleaks scanning. No known advisories or matching secrets were reported by those checks at that checkpoint; scanners cannot prove their absence. The separate Python 3.10 core-runtime check also passed.

A fresh extracted sample ran as a listening local server. Its browser backup/restore rehearsal preserved photos, saved outfits, and the working board, and verified the pre-restore recovery copy. Static sample pages and photos were also exercised on SiteGround. These checks do not amount to a penetration test, independent hosting-header audit, or comprehensive browser-security review.

## Remaining limits

- There is no authentication, built-in TLS, multi-user isolation, or protection from a trusted LAN client intentionally editing data or filling the disk. Use one editing device at a time.
- Databases, browser storage, and backups are not encrypted by the app. They rely on device security and operating-system permissions. Full backups can contain private measurements, wear history, and photos.
- Image header validation is not a full decoder or malware scanner. Worker timeouts and thread limits do not impose an operating-system memory limit on Pillow or ONNX Runtime. Disk quotas, total wardrobe growth, and hostile-client resource exhaustion are not comprehensively sandboxed.
- Normal ingestion and public photo exports re-encode images; restored assets and direct API uploads may retain metadata. Background removal is not anonymization.
- Schema validation covers common fields and unsafe shapes, not a complete formal schema for every profile, trip, or outfit setting. More fuzzing and independent review would provide additional evidence.
- Model weights and optional dependencies are downloaded at setup. Fonts are requested from Google Fonts; the app is not described as making zero external requests. See [THIRD-PARTY.md](THIRD-PARTY.md).
- Windows/macOS installation, final physical-mobile workflows, and broad assistive-technology testing are not established by the automated suite. See [TESTING.md](TESTING.md) for the remaining release checks.

Code and Linty artwork are GPL-3.0-or-later; third-party components retain their own terms. GitHub private vulnerability reporting is enabled. Report security issues privately using [SECURITY.md](../SECURITY.md).

## References

- [OWASP secure code review](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html)
- [OWASP file upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
