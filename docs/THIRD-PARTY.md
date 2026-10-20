# Dependencies and asset inventory

The original project code, documentation, and Linty artwork are GPL-3.0-or-later; see the root LICENSE and NOTICE. Third-party components retain their own licenses. Optional packages and model downloads are separate from the application source.

## Default installation

The server uses the Python standard library, including SQLite. The client is plain HTML, CSS, and JavaScript. No JavaScript framework or third-party runtime package is bundled. Node/npm is used only for development checks; Playwright is an optional development dependency; its package code is not bundled in source ZIPs. The npm lockfile records resolved versions and integrity hashes.

## Optional tools

- Assistant photo import uses Pillow, installed separately through `runtime/requirements-import.txt`.
- Local background removal installs Rembg, ONNX Runtime, Pillow, and their dependencies into a separate environment. Setup downloads the U2Net model. Neither the environment nor model weights are included in the source archive. Package and model terms should be reviewed separately before any future redistribution.

## Fonts and network requests

The current app requests fonts from Google Fonts: Pixelify Sans, Bricolage Grotesque, Hanken Grotesk, IBM Plex Sans, IBM Plex Mono, DM Sans, Fraunces, Caveat, Newsreader, Noto Emoji, Special Elite, Instrument Serif, and Reenie Beanie. Font binaries are not bundled. Browser font requests contact Google Fonts; if unavailable, the CSS uses fallback fonts. Offline typography is therefore not identical. If fonts are bundled later, include each font's required license files and notices in that release.

Native emoji appearance comes from the user's operating system/browser. The optional Noto Emoji font follows the same external-font path above.

## Project images

The app includes Linty artwork (inline images, explicitly packaged PNG originals in app/assets/linty/, and an editable favicon SVG) and a 1×1 blank GIF used by the UI. No retailer product photographs or personal wardrobe photos are part of the public source package. The fictional sample includes 12 AI-generated product photos of invented, unbranded pieces, with prompt provenance in app/assets/demo/. The sample generator uses the bundled photos and needs only Python’s standard library.

Upstream projects and license information:
- Rembg: https://github.com/danielgatis/rembg
- U2Net: https://github.com/xuebinqin/U-2-Net
- Pillow: https://python-pillow.github.io/
- Google Fonts source and per-family license files: https://github.com/google/fonts
- Playwright: https://github.com/microsoft/playwright

## Review tooling

CI uses pip-audit for optional Python dependency advisories and Gitleaks for source-history secret scanning. Gitleaks is downloaded from its official release and checked against a pinned SHA-256. GitHub actions use full commit revisions. These tools are not part of the application runtime. Dependency audits report known advisories for the resolved graph, not a guarantee that all code is safe.

## Optional dependency licenses

These components are installed separately, not copied into the source tree:

| Component | Reviewed version | Declared license |
| --- | --- | --- |
| Playwright (development only) | 1.64.1 | Apache-2.0 |
| Pillow (optional photo tools) | 12.3.0 | MIT-CMU |
| Rembg (optional background removal) | 2.0.85 | MIT |
| ONNX Runtime (optional CPU inference) | 1.31.0 | MIT |

These declarations come from the reviewed package metadata. Their dependencies retain their own notices and are obtained through their package distributions. Model weights and font files are not redistributed here; review their respective terms and include required notices before bundling them in a future release.
