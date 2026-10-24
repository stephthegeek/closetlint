# Add pieces with your own AI assistant

You can build your closet by having a conversation. Ask your AI assistant to find your clothing orders, collect the photos, and add the pieces—or give it a wishlist full of things you're still considering. It can do the naming, tagging, and filing while you decide what belongs in your closet.

Separate OpenAI and Claude import helpers are in development, with initial notes for Amazon, SHEIN, Temu, and Etsy. They use the import workflow described here; platform and retailer trials are still pending.

You don't need to write code or fill out a form for every piece. For automatic additions, your assistant needs permission to read files and run commands on the computer where Closet Lint is installed. There is a little setup the first time; an assistant with that access can handle it for you using the reference below.

## Start with your order emails

If you're comfortable connecting your email to your assistant, this is a useful way to bring in purchases you already own. Email connectors can let it find order confirmations from the stores and dates you choose. Gmail and Outlook are examples; availability depends on your assistant and plan. The connection belongs to your assistant, not Closet Lint.

Try asking:

> Find my clothing and accessory orders from the past three months and add them to Closet Lint as owned pieces, with photos, sizes, colors, prices, and product links where available. Check for duplicates, and ask me about anything unclear. Tell me which orders or items you couldn't finish.

Emails sometimes contain only an order link. Your assistant may need browser access to read those order pages and collect full-size photos. You can narrow the request to one store or a short date range to start, then bring in more later.

## Add your wishlist

Send individual product links, or ask an assistant with a browser extension or browser tools to read your saved wishlist page. For a long page, ask it to work through the list in batches and report how far it got; some stores only load more items as you scroll.

> Add the items on this wishlist page to Closet Lint as wishlist pieces. Use XXL where available, but check with me about sizes or variants that aren't clear. Save the best available model and isolated photos, keep different colors separate, and skip duplicates. Don't buy anything or change my store wishlist.

A screenshot works too. Upload a few screenshots of your saved items, an order, or your own clothes and ask for the same thing. Links help the assistant find better photos and details, but aren't required. If a store blocks access, screenshots are a practical alternative. Missing prices or details should stay blank rather than be guessed.

## Pieces without a product link

Bought it in a shop, made it yourself, or inherited it from a friend? Send your assistant a phone photo and whatever you know about the piece. It can help name and tag it without an order email. You can also ask an AI image editor for a clean product shot on white; see [photos](PHOTOS.md) for a suggested prompt. Keep the original and check that the edited picture still matches what you own.

## Connect it to your closet

1. Start Closet Lint once so your wardrobe folder exists.
2. Tell your assistant where the app folder and wardrobe data folder are, and give it access to them.
3. Give it this instruction, followed by your links, screenshots, or email request:

> Read docs/ASSISTANT-IMPORT.md in my Closet Lint app folder. Set up the supported importer if needed, then use tools/import_pieces.py to add the pieces and photos to my existing wardrobe. Check the current field options with --schema and preview the batch before applying it. Keep unknown facts blank, confirm uncertain prices and variants, and prefer full-size photos with both model and isolated views when available. Tell me what was added, skipped, or couldn't be completed. Never edit the database directly.

Pause edits in the app while the assistant imports, then refresh to see your pieces. You can adjust any titles or tags afterward.

Open **Menu → Utilities → Import pieces** to choose **Have my assistant add pieces** or **Bring back an import file**. Each route prepares a request for your existing assistant conversation. The recent-order shortcut lets you choose a store and inclusive date range; copying its request does not search your email or record a completed check.

If your assistant cannot access the computer running your wardrobe, choose the file route. Load its prepared .json file, review possible matches and missing photos, and save your selected pieces. You can attach photos during review or explicitly add without one. Possible matches start unselected; you can skip them, add a separate piece, or mark an existing wishlist match owned. That ownership action keeps existing photos and tags, and fills only blank size, price, product-link, and supplied-date fields.

Browser imports stop at a failed save. Successful pieces stay saved; retry the remaining pieces in the same open session, or reload the file later to recheck matches. Browser imports do not yet keep the command importer’s batch receipts. Local access, email connectors, and browser tools are separate capabilities; not every assistant includes all three. On a public demo, imports affect only this browser for this site address.

Shipping and refund notices belong in the assistant’s summary; Closet Lint does not track order progress. Refunds do not automatically change ownership, hide a piece, or remove it: you may still keep or use the item.

## Technical reference for assistants

The rest of this page is for the assistant doing the import, or anyone who wants to run the command themselves. You can stop reading here.

### One-time preparation

Start your wardrobe once using [INSTALL.md](INSTALL.md), so its data folder exists. The importer deliberately refuses an unknown/nonexistent data folder: a typo must not silently create another wardrobe.

For photo imports, set up the shared photo environment once. From the app folder, use Python 3.11–3.13:

```bash
python3.12 tools/setup_photos.py --data ../closet-lint
```

On Windows, use `py -3.12` instead of `python3.12`. Adjust the version if you installed 3.11 or 3.13. Add `--background` to also set up local background removal. An existing background-removal environment can already be used for imports, without another installation.

The import command finds the configured environment automatically; you don't need to activate it or install packages into your system Python. Normal app use still needs only Python's standard library. If something fails, run `python3 tools/check_setup.py --data ../closet-lint` (on Windows, use `py -3`) for readiness checks and next steps.

### Batch format

The existing `closet-lint-import/v1` format gains a stable `batchId` and local image-file descriptors for this command:

```text
my-batch/
  import.json
  photos/
    tee-isolated.jpg
    tee-model.jpg
```

```json
{
  "format": "closet-lint-import/v1",
  "batchId": "wishlist-2026-10-19-example",
  "pieces": [{
    "name": "Black ribbed tee",
    "category": "Tops",
    "subcategory": "Tees",
    "status": "wishlist",
    "size": "",
    "retailer": "Example shop",
    "url": "https://example.com/tee",
    "price": null,
    "colors": ["black"],
    "seasons": ["spring", "fall"],
    "styles": ["casual"],
    "looks": [],
    "labAs": "top",
    "layerNeed": "none",
    "weight": "thin",
    "images": [
      {"file": "photos/tee-isolated.jpg", "kind": "isolated"},
      {"file": "photos/tee-model.jpg", "kind": "model"}
    ]
  }]
}
```

These example photo files are not bundled. Use real prepared files or use your own local batch. Generate the current machine-readable example/vocabulary with:

```bash
python3 tools/import_pieces.py --schema
```

Limits: 1–50 pieces, up to 12 saved images per piece, JSON up to 1 MB, source images up to 32 MB each and 192 MB per batch. Files must stay inside the JSON file’s directory, including symlink targets. The command makes no network requests. A URL alone is source metadata, not a downloaded photo.

Image kinds: `isolated`, `model`, `scene`, `flatlay`, `display`, `detail`, `unclassified`, `recast`. The first view becomes the main photo. `sourceUrl` on an image optionally preserves its public HTTPS source. Optional `imageSources` can retain additional `{url, kind}` references without claiming those files were saved. Mark AI-generated views `recast`; keep originals separately.

Each saved image is oriented correctly, capped at a 1600px longest edge without upscaling, and saved as JPEG or transparent PNG. Transparency and available RGB color profiles are retained; EXIF/GPS metadata is removed. The importer does not cut out backgrounds, tint garments, or generate missing details. Keep your original photo files separately if you want full camera-resolution originals.

Item fields include the usual tags plus `variant`, `priceNote`, `originalTitle`, `listingDetails`, `fitsLike`, `date` (YYYY-MM-DD) and the upper-body layering options shown by `--schema`. Unknown fields are omitted and reported. Unknown tags are omitted with warnings. Missing prices remain unknown; supplied prices must be confirmed nonnegative USD amounts with at most two decimals. Saved pieces start Unreviewed so tags can be refined later.

### Preview and save

From the app source folder:

```bash
python3 tools/import_pieces.py --data ../closet-lint --file /path/to/my-batch/import.json
```

This validates every row and image, reads the existing wardrobe, and prints JSON describing planned additions/skips. It saves nothing. To commit:

```bash
python3 tools/import_pieces.py --data ../closet-lint --file /path/to/my-batch/import.json --apply
```

All pieces, saved image bytes, and the batch receipt commit together in one transaction. A validation or write failure leaves no partial batch. The running app may stay open; pause edits during intake and refresh afterward so its in-memory view sees the additions. No importer UI needs to open.

### Duplicates and retries

Likely matches use product identity or normalized name, while distinguishing known sizes, variants, and colors. They check both the existing effective wardrobe and earlier rows in the same batch. This is a heuristic, not perfect product identification. Ambiguous matches are skipped by default and listed in the report.

- `--promote-wishlist`: when an incoming Owned piece has exactly one wishlist match, change only its ownership. Existing tags, photos, price, and wear history remain intact.
- `--duplicates add`: explicitly permit a duplicate. Prefer accurate variants/sizes and a preview over this override.
- `--allow-no-photo`: explicitly allow a piece without any local image. Otherwise photos are required.

Keep the same batch ID, manifest, image files, and options for a retry. A successful retry returns `already-applied` without adding anything again. Reusing a completed batch ID for different content/options is rejected; use a new ID for a genuinely new batch. Receipts are included in full backups/restores. A batch receipt is not an undo button.

Exit status is 0 for a valid preview/successful apply/already-applied receipt, or 2 with a JSON error on stderr for invalid input or a storage failure. Reports distinguish `added`, `promoted`, `skipped`, and actual `photosSaved`; each row lists image dimensions and warnings. No-photo and duplicate overrides are never enabled automatically.

### Developer checks

`runtime/piece_import.py` owns validation/preparation and transactional intake using the existing Store connection. `tools/import_pieces.py` is the public command. No new network endpoint is exposed.

The checked-in `runtime/import-vocabulary.json` is generated from the app’s real categories and tag dimensions. After editing that vocabulary, run `node tools/sync_import_vocab.js`; the unit suite checks synchronization. Node is only a development dependency.

Install the photo requirements before running the full importer tests. `tests/test_piece_import.py` uses temporary synthetic wardrobes/images for preview, apply, gallery metadata, duplicates, ownership promotion, rollback, retries, backup receipts, concurrency, file containment, orientation, and metadata removal. Photo tests explicitly skip if Pillow is unavailable.
