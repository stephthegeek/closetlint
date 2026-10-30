# Setup and DIY imports

An empty wardrobe opens the setup wizard. You can revisit setup through **Menu → Utilities → Getting started**. **+ → Bulk import pieces** opens the import workspace page, keeping repeat imports separate from first-time setup.

Getting started has four optional sections: Your closet (name and Linty logo visibility), Preferences (units and emoji pack), Categories (searchable category visibility choices), and Pieces & photos (add manually, import with your assistant, restore a full backup, or browse first). You can move directly between sections. Returning after setup opens Pieces & photos, where the optional photo-tools check is available. No measurement entry is part of onboarding.

Category choices save with the wardrobe and are included in backups. Sensible defaults are ready to use, and categories containing saved pieces stay visible. The same chooser is available in View settings.

The closet name and logo visibility are saved in the wardrobe profile and included in full backups. They can be changed later in View settings, where the name saves after a short typing pause or on leaving the field and logo visibility saves immediately. A save failure keeps the entered values and offers Retry. No custom logo upload is provided. Units and emoji choices are browser preferences; measurements do not determine the emoji pack.

The optional photo check reports whether browse previews are enabled and background removal is configured; configuration is not a verified model-processing test. It installs nothing, handles an unavailable service, and points to the existing full setup check for installation instructions. Normal photos remain usable without these tools.

## DIY flow

1. Choose a route: Set up direct import verifies local assistant access to this exact wardrobe, or your assistant prepares a file for review here. Pick the sources, stores, date range, and optional piece limit for its request.
2. Copy the request into your own assistant. Use its existing email/browser tools with your permission, or use selected source uploads. Closet Lint does not connect to accounts or request API keys here. A recent order request is a scope, not a record of a completed email search.
3. For the review route, choose the import ZIP containing the JSON and photos, choose JSON alone, or paste the prepared JSON. The direct route supplies exact installation commands, checks the wardrobe identity, previews and saves through the importer, and lets Check import verify its saved receipt before loading additions.
4. Review/edit names, categories, ownership, sizes, source, USD prices, and product links. Uncheck unwanted rows. Possible matches start unchecked. Compare them, then explicitly skip, add a separate piece, or mark an existing wishlist piece owned.
5. Attach missing photos, explicitly choose Add without a photo, or skip the piece. Save checked pieces, then refine details on their piece pages.

Imports can include a public HTTPS `photoUrl`, a named `photoFile` to attach during review, or several `images` entries with `{url, kind}` (or `{file, kind}` for photos bundled in an import ZIP). Garment views can be isolated, model, scene, flatlay, display, detail, recast, or unclassified. The first garment view is the main photo; care-label references stay separate. Downloads can fail because of retailer/CORS restrictions; attaching an image file is the fallback. Photos are capped at a 1600px longest edge without upscaling. Pieces without a saved photo get a placeholder; new pieces are marked Unreviewed. Every source and route requests evidence-based naming and tagging; `styles` is Occasion, and `looks` is Aesthetic. Field labels and category/subcategory scopes accompany the vocabulary. Unknown factual details stay blank; useful visual classifications need not be written in the source. Tags must match existing vocabulary; unknown tags are dropped. The review shows retained tags; edit them afterward on the piece page.

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

Use 1–50 pieces and a file under 1 MB; larger requests use separate files rather than a ten-piece default. `status` is `owned` or `wishlist`; category and name are required. The in-app prompt includes current allowed categories/subcategories/tags. Unknown size/price/link should remain blank or null rather than guessed. Prices are clearly known USD item prices only. Export no credentials, addresses, payment details, order IDs, or email bodies. Unrecognized fields, including existing photo IDs and private profile fields, are ignored. Supported optional image/source and layering fields are included in the app-generated prompt.

## Saving and recovery

All selected rows validate before any are written. New pieces get new IDs in the `custom` collection. Explicit wishlist promotion updates the matching piece instead: it keeps existing photos and tags and fills only supported blank fields. Writes run sequentially. If storage fails, successful rows stay locked and retries use the same IDs for failed rows within the open session. A reload loses draft/retry state; reload the batch and review duplicate warnings before retrying. Possible matches use normalized names or product links, with size, variant, and color checks where known; they are suggestions to review, not a guarantee. Photo downloads time out after 30 seconds and allow retry; already saved rows and successful uploaded views are retained within the open review session.

Full-backup restore remains a separate replacement operation with its existing preview and recovery copy. It is not the same as adding JSON pieces.

## Add directly through your assistant

For an assistant with authorized local command access, [ASSISTANT-IMPORT.md](ASSISTANT-IMPORT.md) describes adding a prepared batch without clicking through the app. That command accepts local image files and a batch ID; its file-based format is separate from the in-app review route.

The app does not include direct email or retailer connectors. Category and tag vocabularies are currently fixed; use the current import prompt rather than inventing new values.


## Direct import setup · 0.3

Set up direct import explains local Claude Code and ChatGPT/Codex sessions, the host computer's folders, cloud/repository limitations, and separate access to photos, email, and browser tools. Its first request checks setup only. Check setup reads recorded evidence and current photo readiness; only verified setup enables Continue. Later batches can reuse valid setup, while each import request rechecks identity/access. Ordinary chat/file import remains separate.

The generated direct request uses the supported CLI schema, exact destination, temporary batch folder, expected wardrobe identity, and stable batch ID. It has no browser ZIP contract or automatic route fallback. Check import reads the committed receipt; previews/checks cannot appear as saved pieces. Pending batch identity survives closing/reloading in this browser. Load saved additions preserves the existing unsaved-edit/retry guards. Start another import creates a new ID. This is a local handoff, not an assistant login, automatic connection, or new remote integration.


## Shared source uploads (0.3)

The source step includes **Add photos or files** for every import option. Use one photo per item or confirmed multipack, or mark an image **Screenshot or reference** when it supports the batch. **Create individual product photos** reveals **Anything the photo doesn’t show? (optional)** for that item. Keep guidance short and concrete, such as the actual color or a hidden detail. Originals are preserved alongside requested recasts; the uploader does not offer alternate views per item.

On the local runtime, uploads and photo choices survive closing/reopening the wizard and restarting the server. They do not create pieces, appear in browse, or get included in full wardrobe backups until imported. The browser remembers the current batch on this installation; it does not provide a cross-device batch list. Sources remain in the private `imports/` folder until removed. Removing an upload affects its staged copy, not saved pieces or the user's original file. Browser-only installations can reuse uploads while the import window remains open.

Direct Codex/Claude Code handoffs include saved paths. Image editing is optional and depends on the assistant's tools. Chat-based handoffs explain that the user must also attach the sources in the AI conversation, offer downloads, and let returned JSON reuse staged originals with source IDs. Only newly edited photos need to come back. A failed upload can be retried with the same ID; a failed photo-choice save retains the entered text and blocks the handoff until retried. Existing ZIP/JSON review and missing-photo recovery remain available.

Accepted uploads: JPEG, PNG, WebP, GIF, PDF, UTF-8 text/CSV/JSON, and ZIP source exports. Maximum 50 files, 10 MB per file, and 100 MB per batch. Source ZIPs are stored for the assistant, not unpacked by the upload endpoint. Export HEIC photos to JPEG first. Upload endpoints use the existing local authorization and expected wardrobe identity; source IDs never resolve arbitrary paths.


### Connection, local paths, and editing access

After verified setup, the entry screen shows **Connected to [computer name]**. This identifies the wardrobe computer reported by the running service. Selecting Codex or Claude Code changes guidance; it does not independently verify an AI-account connection.

The optional local-path field asks for a full path on that computer and includes Windows, macOS, and Linux examples and file-manager instructions. Quotes from Windows Copy as path are accepted. Uploading through Closet Lint remains the easier choice from a phone.

Image-editing requests allow connected editors for any assistant. If a service requires another connection, payment, or permission to share the selected photos, the request tells the assistant to explain it and wait for the user's choice. Unavailable, declined, or failed editing falls back to originals, with unfinished edits named explicitly.

Loading a verified saved import clears the temporary busy indicator before asking the browser to reload. Canceling a browser leave-page warning therefore leaves the import controls usable, and a failed pending-save flush keeps the page open with an error. The saved import receipt remains valid in either case.


Continuing direct imports keep one request across verified save parts, with a combined saved total and a separate assistant-reported completion/needs-input state. Leave the piece limit blank for everything selected. Continue a paused request in the same assistant conversation; Check import reads progress, and setup need not be repeated. File imports can return numbered files of up to 50 pieces each; Load next file preserves staged original-photo references during review. Store is free text and remembers the last entry, not a certified retailer selector. Use the multipack option for confirmed pack members and the product-photo option for their individual images; unrelated pieces in one photo still need clarified intent or manual crops. See [continuation and retailer details](ASSISTANT-IMPORT.md#continuing-imports-and-repeat-checks--03).


During direct import, your assistant may ask for approvals more than once—for file access, import commands, photo downloads, or browser actions. Review requests in the assistant app so it can continue. Setup verification does not approve every later action, and an approval pause does not require starting the import again.


Import requests focus on clothing, shoes, jewelry, and accessories. The assistant skips housewares and other unrelated purchases; these do not count toward an optional piece limit. The source screen explains this before you prepare the request.


**Prepare your pieces** offers separate multipack records and individual product photos for every source. Both start unchecked. Record splitting alone keeps the original pack photo; the photo option asks an available editor to prepare each member on a plain background. Individual upload choices override the overall photo choice. If editing cannot finish, the import keeps originals and shows the reported reason in review/results. Imported pieces remain Unreviewed.

Unfinished import reviews are kept in this browser, including their selected photos, when the draft notice confirms they are stored. Back leaves the review available; Start over explicitly clears it. Reload recovery retains saved-row identities and rechecks possible new matches before adding pieces. Direct requests still use their existing saved server progress. See [Batch workspaces](NAVIGATION.md#batch-workspaces) for recovery limits.
