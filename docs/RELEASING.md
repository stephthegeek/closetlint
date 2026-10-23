# Release workflow

A release is a tested, fixed version of Closet Lint that people can download and update to. A dev-site deployment previews development work; it does not create a release.

## Branches and sites

- `main` contains reviewed, releasable code. Use focused branches for feature work and a release branch for a fixed group of changes.
- `codex/release-0.2` starts from the published 0.1 main and carries the agreed general improvements. Sky and the daily fortune remain on development branches.
- The public sample demo should follow a published release. The dev playground can show experiments ahead of it; its wardrobe snapshot and app-code deployment are separate choices.
- Keep wardrobe data outside app checkouts. Switching or updating app source does not transfer a wardrobe between installations, browsers, or sites.

## Version numbers

Use patch versions such as `0.1.1` for small compatible fixes, minor versions such as `0.2.0` for meaningful feature batches, and candidate versions such as `0.2.0-rc.1` for final testing. A `0.x` version is an early-development version, not a percentage complete. A future `1.0.0` means a dependable core and a documented compatibility commitment, rather than every planned feature.

Publish a new version for changes to a release. Keep published tags and ZIP contents fixed. A branch ZIP changes as the branch changes; the versioned release asset identifies a fixed package.

## Current 0.2 scope

Feature scope frozen on 23 October 2026 after the focused taste-statistics and stalled-photo recovery fixes. Only safety or core-workflow blockers enter during verification.

Purpose: make Closet Lint easier to install, populate, keep updated, and discuss with an assistant.

Release checklist: [REL-04 on Trello](https://trello.com/c/J2yJP6aM).

Included work:

- [Setup and repeat imports](https://trello.com/c/HdvgZYN0): direct-assistant and prepared-file paths, scoped repeat requests, match review, explicit photo choices, and save/retry recovery.
- [Friendly setup and shared photo tools](https://trello.com/c/BLQMMBPU): read-only readiness guidance, isolated optional dependencies, and reuse of existing photo environments.
- [Tidy photos improvements](https://trello.com/c/WRWxzgtR): batch scroll reset, Save and close, category scopes, remembered original choices, and new-photo eligibility.
- [View settings and agreed refinements](https://trello.com/c/CVSD0H2j): display reset, storage wording, photo canvas, sidebar controls, single-choice Stretch, preserved bulk selection, toast timing, bounded Lab lists, and agreed icon labels.

- [Closet Oracle](https://trello.com/c/N3OuiMux): read-only analysis handoff, scoped context, optional details/photos, local-assistant and chat routes, and clipboard/download recovery. Added at the owner’s request before final testing. See [ORACLE.md](ORACLE.md).

- [My taste](https://trello.com/c/qoe2TGTM): distinct-outfit counts, current-tag refresh, clear Loved/Liked/Passed evidence, and paged examples behind the patterns. Added at the owner’s request before final testing.

Sky, the daily fortune, occasion prototypes, assistant-plugin publication, accounts/sync, affiliate work, and marketing work are outside this release. Only blockers affecting safety or a core workflow enter the scope during final testing. Other ideas remain in the backlog.

## Release countdown

1. Fix the feature scope and isolate the branch from experimental work.
2. Obtain owner desktop/phone review and resolve core-workflow blockers. Spot-check all three themes in light/dark; exercise full workflows in one chosen theme rather than repeating every combination.
3. Verify both import routes using temporary synthetic data: owned/wishlist, existing matches, photo failures, ownership changes, partial saves, retry, and a check with no new items. Never create test pieces in a personal wardrobe.
4. Check the extracted package: core startup without optional dependencies, setup guidance, update against existing synthetic data, and backup/restore. Verify the package contains no personal data or excluded feature modules.
5. Pass CI and finalize the documentation, supported-platform limits, release notes, and tested ZIP. Record the exact commit and artifact hash. Do not claim Windows/macOS verification without evidence.
6. After final approval, merge the reviewed PR, tag the version, publish the tested ZIP, update the stable demo, and record the shipped version on each feature card.

An implementation check is not owner visual approval, and an automated pass is not a fresh-install or device certification. Record which checks actually ran and what remains open.

## Trello maintenance

Use the existing idea/backlog, Todo, and Doing lists, plus Ready for review and Done. Give substantial features their own acceptance criteria. The release card links its fixed feature set and owns the final countdown; it is the place to answer what remains before shipping.

Implemented software stays in Ready for review until its review and containing release are complete. Move shipped work to Done and record the released version. Keep completed historical evidence, but lead card descriptions with current status. The small-tweaks card holds small remaining ideas; it should not become the only record of a substantial feature or silently expand a release.

Update cards when implementation, review, or publication changes state. Use target versions in titles or labels, and link the relevant PR. Review the next release scope at a release boundary instead of treating every new idea as a requirement for the version already being tested.
