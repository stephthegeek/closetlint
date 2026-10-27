# Security review record

**Release blocker: open.** The earlier 0.1 review below does not cover the new browser ZIP importer. Functional tests and the existing archive checks are preliminary evidence, not security sign-off for this feature.

Before releasing 0.2:

- Review the final ZIP parser and the JSON/photo handoff as untrusted input: central and local header consistency, offsets, overlapping entries, malformed/truncated data, CRCs, duplicate names, ambiguous references, unsafe paths, links, encryption, and unsupported archive variants.
- Exercise compression bombs and false size headers; verify compressed, expanded, entry-count, per-photo, JSON, CPU, and memory bounds, including cancellation and browser responsiveness.
- Review image signatures versus actual decoding, supported formats, browser isolation, and malformed image behavior. Confirm imported text cannot introduce executable HTML or scripts.
- Verify ZIP-local URLs are trusted only within their import session, never leak into saved records, and are revoked on success, errors, replacement, cancellation, and stale async reads.
- Verify no wardrobe writes happen before review, failed/retried saves preserve correct photos and matches, and archive input cannot target existing files or change the full-backup restore flow.
- Test the final browser implementation, including supported mobile/browser behavior and unavailable decompression fallback. Record findings, fixes, focused adversarial tests, residual limits, and the exact reviewed commit.
- Tie the completed review to the fresh release candidate and package hash. Later ZIP-related code changes require rechecking the affected areas before publication.

Do not close this gate solely because the normal import suite passes. Record the review's actual scope and reviewer type; do not describe an AI-assisted review as an independent human audit.

## 24 October review checkpoint

AI-assisted source review and adversarial tests identified and fixed missing overlap rejection and missing active cancellation/total elapsed-time bounds in browser ZIP loading. The parser now checks local sizes/CRCs against the directory, validates streaming data descriptors, rejects overlapping local-entry ranges and unsupported file types/flags, bounds expansion, and applies a 30-second elapsed-time budget across awaited reads. Closing the import or replacing its file aborts the active load. Already-created session photo URLs are revoked on cancellation and errors. PNG detection now checks the complete eight-byte signature.

Automated adversarial cases cover stored/Deflate archives, CRC failures, header disagreement, overlapping entries, descriptor success/failure, unsafe and ambiguous names, unsupported types, symlinks, encryption, declared size limits, false expansion sizes, missing native decompression, early/in-progress cancellation, elapsed-time limits, and URL cleanup. Existing import flow tests cover no writes before review, photo save/retry behavior, and exclusion of ephemeral URLs from saved records.

These are bounded browser operations, not an operating-system memory sandbox. The input is limited to 50 MB and declared expansion to 100 MB; buffers, Blob storage, and decoder allocations add overhead. Browser image decoding happens in the browser's own isolation; malformed images must still pass the existing rasterizer before save. This review does not establish a hard memory ceiling or comprehensive browser-engine exploit protection.

**Gate remains open:** final extracted-package browser verification, exact reviewed commit, candidate hash, and final CI/advisory/secret checks must be attached before publication. This checkpoint is not an independent human audit.

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

25 October 0.2 release follow-up: website terms, permission, and responsibility guidance was added to three browser-assistance descriptions. Removing those three copy additions reproduces the security-reviewed setup module exactly; ZIP parsing and import behavior are unchanged.

## 0.3 candidate scope

Sky and daily readings run locally. Sky sharing renders a chart image without garment photos, purchase details, or the local server address. Daily readings use bundled text and local wardrobe inputs. The previous ZIP-import review remains historical evidence, not a new independent audit of 0.3. The release allowlist and embedded-data/credential-pattern scan pass at source preparation; dependency checks and extracted-candidate validation must be recorded separately before publishing. No independent human security audit is claimed.


Direct-import setup (0.3): installation paths and batch status are read only through the local runtime's existing token/Host/Origin boundary. They are not embedded into public-demo HTML or the browser-file request. Copied assistant instructions omit the browser token. Setup checks write only profile evidence; previews do not create saved receipts. Generated imports carry the expected wardrobe identity, checked inside the import transaction before receipt lookup or mutations. Saved results require a committed receipt for the exact batch. No new remote import mutation endpoint or assistant account connection was introduced. Reusable setup markers contain local paths in full private backups and are invalidated by changed app/data locations. Existing public-demo generation allowlists its profile content.
