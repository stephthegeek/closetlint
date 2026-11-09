# Dependencies and asset inventory

The original project code, documentation, and Linty artwork are GPL-3.0-or-later; see the root LICENSE and NOTICE. Third-party components retain their own licenses. Optional packages and model downloads are separate from the application source.

## Default installation

The server uses the Python standard library, including SQLite. The client is plain HTML, CSS, and JavaScript. No JavaScript framework is used. Astronomy Engine is bundled for local solar and lunar calculations; see its license below. Node/npm is used for development checks and the experimental hosting adapter; local app use does not require it. Playwright is an optional development dependency; its package code is not bundled in source ZIPs. The npm lockfile records resolved versions and integrity hashes.

## Optional tools

- Browse previews and AI assistant photo import use Pillow, installed in the shared optional environment by `tools/setup_photos.py`, using `runtime/requirements-import.txt`.
- Local background removal installs ONNX Runtime, NumPy, Pillow, and their dependencies into a separate environment. Setup downloads and verifies U²-Net for general photos and ISNet for Jewelry and Eyewear. Neither the environment nor model weights are included in the source archive. Package and model terms should be reviewed separately before any future redistribution.

## Optional city suggestions and weather

Trips uses [Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api), based on [GeoNames](https://www.geonames.org/), for online destination suggestions. Only the typed destination is sent, with no wardrobe records. The local runtime forwards queries to the fixed service endpoint; static sites query it directly. Manual destination entry remains available without the service. The public API has free non-commercial usage terms and limits; commercial deployments need to review the provider’s paid or self-hosted options.

**Get typical weather** uses the [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api). It averages daily lows and highs for the trip’s season across the three most recent completed calendar years, including a three-day margin around the trip dates. These recent seasonal averages are not a forecast or long-term climate normals. The rain/snow packing suggestion is enabled when at least 30% of sampled days have 1 mm or more precipitation. Review the result and edit it for your plans.

Weather requests send the selected location’s coordinates and a generic historical date range, not trip names, actual travel dates, packing lists, or wardrobe records. Choosing a destination suggestion avoids silently using the wrong city. Local requests go through fixed, token-protected endpoints with timeouts, response limits, and bounded in-memory caches; static sites contact the provider directly. No API key or additional Python package is required. Manual weather entry stays available if lookup is unavailable. The same provider usage terms above apply.

Almanac can use the same city suggestions and Open-Meteo forecasts for today’s weather. Forecast requests send the selected coordinates, without wardrobe records. Choosing a city is optional; solar and lunar calculations use the bundled Astronomy Engine locally.

## Fonts and network requests

The current app requests fonts from Google Fonts: Pixelify Sans, Bricolage Grotesque, Hanken Grotesk, IBM Plex Sans, IBM Plex Mono, DM Sans, Fraunces, Caveat, Newsreader, Noto Emoji, Special Elite, Instrument Serif, and Reenie Beanie. Font binaries are not bundled. Browser font requests contact Google Fonts; if unavailable, the CSS uses fallback fonts. Offline typography is therefore not identical. If fonts are bundled later, include each font's required license files and notices in that release.

Native emoji appearance comes from the user's operating system/browser. The optional Noto Emoji font follows the same external font path above.

## Project images

The app includes Linty artwork (inline images, explicitly packaged PNG originals in app/assets/linty/, and an editable favicon SVG) and a 1×1 blank GIF used by the UI. No retailer product photographs or personal wardrobe photos are part of the public source package. The fictional sample includes 12 AI-generated product photos of invented, unbranded pieces, with prompt provenance in app/assets/demo/. The sample generator uses the bundled photos and needs only Python’s standard library. Comfort zone also includes generated photographic examples of unbranded clothing, accessories, and fabrics. They illustrate quiz choices and are not retailer photos or product recommendations. The shipped sheets and their quiz mappings are listed in `app/assets/quiz-photos/manifest.json`.

Upstream projects and license information:
- Rembg's U²-Net model release and inference reference: https://github.com/danielgatis/rembg
- U2Net: https://github.com/xuebinqin/U-2-Net
- ISNet: https://github.com/xuebinqin/DIS
- ISNet inference and model download reference: https://github.com/danielgatis/rembg/blob/main/rembg/sessions/dis_general_use.py
- Pillow: https://python-pillow.github.io/
- Google Fonts source and per family license files: https://github.com/google/fonts
- Playwright: https://github.com/microsoft/playwright

## Review tooling

CI uses pip-audit for optional Python dependency advisories and Gitleaks for source history secret scanning. Gitleaks is downloaded from its official release and checked against a pinned SHA-256. GitHub actions use full commit revisions. These tools are not part of the application runtime. Dependency audits report known advisories for the resolved graph, not a guarantee that all code is safe.

## Optional dependency licenses

These components are installed separately, not copied into the source tree:

| Component | Reviewed version | Declared license |
| --- | --- | --- |
| Playwright (development only) | 1.64.1 | Apache-2.0 |
| Pillow (optional photo tools) | 13.0.0 | MIT-CMU |
| NumPy (optional background removal) | 2.5.4 | BSD-3-Clause |
| ONNX Runtime (optional CPU inference) | 1.31.0 | MIT |

These declarations come from the reviewed package metadata. Their dependencies retain their own notices and are obtained through their package distributions. Model weights and font files are not redistributed here; review their respective terms and include required notices before bundling them in a future release.

Astronomy Engine 2.1.19 (MIT), by Don Cross: bundled browser UMD build in `app/vendor/astronomy-2.1.19.js`, fetched from jsDelivr. [Upstream source and license](https://github.com/cosinekitty/astronomy/tree/v2.1.19). Profile uses it locally for solar/lunar calculations. Today’s weather and city lookup use Open-Meteo; only the city query or coordinates are sent, never wardrobe records.
