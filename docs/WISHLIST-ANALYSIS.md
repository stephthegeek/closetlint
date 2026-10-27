# Wishlist analysis

Analysis version `2.1.1` (`WISHLIST_ANALYSIS_VERSION`) keeps color, aesthetic, and occasion observations independent. Version 2.0.0 introduced narrower similarity and versioned evidence; 2.1.0 removes its shared-style gate and repetitive missing-details badges. Version 2.1.1 corrects the layer pool for normalized cardigans and recorded layers, and prevents a multicolor palette with a neutral accent from counting as wholly neutral. It never changes ranking scores, pair selection, ordering, section thresholds, prices, or saved assistant notes.

## Potential partners

The active closet excludes wishlist, hidden, stored, donation, and removed pieces. Tops are compared with bottoms; bottoms and outerwear with tops; one-pieces with outerwear and recorded layers (including cardigans stored under Tops and tops marked for either role); other categories with core clothing. Color compatibility uses known neutrals, shared colors, or broad color families. Explicit known colors can still support a match when multicolor is also recorded; the unspecified palette cannot establish neutrality or similarity. Aesthetic and occasion counts independently report shared tags. Occasion tags such as casual/dressy are supporting context, not evidence of a complete outfit. Different tags do not mean missing details; missing fields only limit their own observation. No repeated “needs more details” badge or generic zero-match verdict is shown. These are descriptive observations, not outfit guarantees.

## Possible overlap

Owned and active wishlist candidates must share an explicit category and subcategory, the same nonempty normalized recorded color palette, and at least one descriptive tag in pattern, material, details, neckline, length, sleeve, or shape. Color aliases and tag casing normalize. Unknown values, multicolor placeholders, and generic plain/solid/regular/basic tags cannot establish similarity. Occasion, aesthetic, or season alone cannot establish overlap. These are pieces to compare, not duplicate determinations. Broad category counts no longer imply a gap or excess.

## Lab and wear context

Owned favorites add context among color-compatible candidates. Personal context excludes known season and casual/dressy conflicts, but never requires identical aesthetic or occasion tags. The Lab's validated, latest-per-combination rating entries identify color candidates appearing in outfits rated Like or Love. This does not rate the wishlist piece, assign the outfit's rating to individual pieces, or infer disliked features. A newer negative rating replaces an older positive rating for the same combination.

Repeat wear context counts partners with at least three distinct valid logged dates in the past 365 days, excluding future dates. Missing or sparse logs do not count against a piece. The UI does not claim that individual wear dates establish co-worn outfits.

Saved assistant prose is retained verbatim with a “Saved note” prefix. It is separate from live evidence and may be older.

`tests/wishlist-analysis.js` checks missing data, strict overlap, latest Lab evidence, wear dates, inactive-piece exclusions, and unchanged ranking/state.

Head-to-head refreshes current piece records and live evidence after wardrobe updates while retaining valid comparison IDs. Opening details with the keyboard does not submit a preference. `tests/wishlist-photos.js` covers these interaction regressions.
