# AI Use & Security

Closet Lint is an AI-assisted project. Stephanie (stephthegeek) directs the product, interaction design, copy, and visual review. AI assistants have written and revised substantial portions of the implementation, tests, and documentation.

We use synthetic fixtures for automated checks, review changes against the intended behavior, test imports and backup recovery, and record known limitations. The 0.1 candidate has passed the JavaScript and Python suites, dependency advisory checks, public-source checks, and full-history secret scanning in GitHub Actions. A separate sample installation was used for hands-on backup and restore checks. Passing those checks does not prove that the software has no defects.

The initial code-first security review was also AI-assisted. It is not independent human security review, and we do not describe it as one. External review is welcome. Security problems should be reported through [**GitHub private vulnerability reporting**](https://github.com/stephthegeek/closetlint/security/advisories/new), not public issues; see [SECURITY.md](SECURITY.md) for instructions and what to include.

AI is optional when using the app. Closet Lint does not include an inbox connector, a retailer scraping service, or an embedded provider API key. Users can authorize their own assistant to prepare a local import batch. Local background removal uses a downloaded segmentation model; it changes transparency rather than redrawing the garment, and keeps originals. The included sample photos and Linty artwork were created with generative image tools. Sample prompts and provenance are included in `app/assets/demo/`; the code and Linty artwork are licensed GPL-3.0-or-later, to the extent contributors hold applicable rights. See LICENSE and NOTICE.
