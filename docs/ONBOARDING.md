# Setup and DIY imports

An empty wardrobe opens the setup wizard. You can also open **Menu → Utilities → Import pieces / Setup wizard**.

Choose what you want help with: rediscovering owned clothes, outfit ideas, shopping decisions, or packing. These choices suggest where to start; every feature stays available. Add pieces manually, restore a full backup, or prepare an import with your own assistant.

## DIY flow

1. Choose your assistant’s email connector, its browser extension for order-history/wishlist pages, or screenshots/files as a fallback.
2. Copy the tailored prompt into your own assistant. Use its existing tools or attach chosen screenshots/files. Closet Lint does not connect to accounts or request API keys here.
3. Paste the prepared JSON or choose a JSON file.
4. Review/edit names, categories, ownership, sizes, source, USD prices, and product links. Uncheck unwanted rows. Possible name-and-size duplicates start unchecked.
5. Add checked pieces with their attached/available photos, then refine tags on their cards.

Imports can include a public HTTPS `photoUrl`, a named `photoFile` to attach during review, or several `images` entries with `{url, kind}`. Available kinds are isolated, model, scene, flatlay, display, detail, and unclassified. The first saved image is the main view. Downloads can fail because of retailer/CORS restrictions; attaching an image file is the fallback. Photos are capped at a 1600px longest edge without upscaling. Pieces without a saved photo get a placeholder; new pieces are marked Unreviewed. Tags must match existing vocabulary; unknown tags are dropped. The review shows retained tags; edit them afterward on the piece page.

## Format

```json
{
  "format": "closet-lint-import/v1",
  "pieces": [{
    "name": "Black cotton tee",
    "category": "Tops",
    "subcategory": "Tees",
    "status": "owned",
    "size": "",
    "retailer": "",
    "url": "",
    "price": null,
    "colors": ["black"],
    "seasons": [],
    "styles": [],
    "looks": []
  }]
}
```

Use 1–50 pieces and a file under 1 MB; about ten pieces is a good starting batch. `status` is `owned` or `wishlist`; category and name are required. The in-app prompt includes current allowed categories/subcategories/tags. Unknown size/price/link should remain blank or null rather than guessed. Prices are clearly known USD item prices only. Export no credentials, addresses, payment details, order IDs, or email bodies. Unrecognized fields, including existing photo IDs and private profile fields, are ignored. Supported optional image/source and layering fields are included in the app-generated prompt.

## Saving and recovery

All selected rows validate before any are written. Each gets a new ID in the `custom` collection, so existing pieces are not overwritten. Writes run sequentially. If storage fails, successful rows stay locked and retries use the same IDs for failed rows within the open session. A reload loses draft/retry state; reload the batch and review duplicate warnings before retrying. Duplicate matching is a heuristic based on normalized name + size, not a guarantee.

Full-backup restore remains a separate replacement operation with its existing preview and recovery copy. It is not the same as adding JSON pieces.

## Add directly through your assistant

For an assistant with authorized local command access, [ASSISTANT-IMPORT.md](ASSISTANT-IMPORT.md) describes adding a prepared batch without clicking through the app. That command accepts local image files and a batch ID; its file-based format is separate from the in-app review route.

The app does not include direct email or retailer connectors. Category and tag vocabularies are currently fixed; use the current import prompt rather than inventing new values.
