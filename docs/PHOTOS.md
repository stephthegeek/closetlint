# Photos

You can keep several photos of a piece: on a model, laid flat, isolated, or a close-up. Upload your own, use screenshots, or ask your AI assistant to collect the available views from a product link.

## Offline clothes count too

Thrift-shop find? Hand-me-down? An ordinary phone photo is enough to add it to your closet. An AI image editor can sometimes help make a clearer product photo.

If you want a cleaner product shot, upload it to an AI image editor and try:

> Turn this into a realistic product photo of the same garment, isolated on a plain white background. Keep its color, proportions, fabric texture, pattern, seams, and fastenings. Remove the surrounding clutter, and don't add details.

Add a few descriptors if needed, such as “fine ribbed cotton” or “deep burgundy.” Check the result against the real piece, though: generative editing can change details. Keep your original, and save the edited version as another photo. Plain white isn't transparent; the optional background remover below can make a cutout.

## Choose and display photos

Open a piece and expand **Photo options** to add another photo or make the selected view its main photo. The main photo appears in your closet; clicking a gallery thumbnail only changes the view you're looking at.

**Thumbnail framing** lets you show the whole photo or fill the frame with a crop. Model photos normally fill the frame; isolated pieces stay fully visible. Tap the large photo to enlarge it.

Each piece can have up to 12 photos, including background-removed versions. Saved images are limited to 1600 pixels on their longest edge, so keep your camera originals separately if you need full resolution.

## Faster browse previews

With the optional photo environment installed, the local server builds 640-pixel WebP previews in the background. It reuses Pillow from photo import or background-removal setup; it does not require another package or AI model. Existing photos are prepared after server startup, with requested previews prioritized. New photos are prepared when browsed.

Browse uses the smaller previews, while piece pages, editing, background removal, and backups keep the saved originals. Preview colors use mild lossy compression; transparency is retained. An original is shown whenever its preview is not ready, fails, or would be larger than the original. If the photo environment is missing or its WebP codec is unavailable, normal browsing still works with originals.

Older catalog photos that were stored together in large bundles are served as individual images, too. The server keeps disposable copies in `DATA/cache/catalog-photos-v1`, so opening the closet does not download every old photo first. The original bundles remain unchanged in the database and backups.

Previews live in `DATA/cache/thumbnails-v1`, outside the wardrobe database and full backup. They use extra disk space and can be deleted with the server stopped; the server rebuilds them. The first background pass uses some CPU, with one image worker at a time. Source changes, including backup restores, use a different cache key so an old preview is not shown for different photo bytes.

To enable previews without background removal, run `python3.12 tools/setup_photos.py --data ../closet-lint`, then restart the server. Use the same photo-setup Python version guidance below. Existing background-removal installations already have the required image tools.

## Optional: remove backgrounds

Background removal is optional and runs on the computer hosting Closet Lint. It keeps the original photo and creates a separate version with a transparent background. It doesn't redraw the garment or remove a person wearing it.

Choose **Remove background** and check the result. **Use cutout as main photo** saves it as the main photo; **Discard** keeps the original as it was. The original remains available either way.

For several pieces, open **Menu → Utilities → Tidy photos**. Choose a collection or another group, then review up to 12 pairs at a time. Tidy photos works on each piece’s current main photo, including an isolated or AI recast view. Each piece starts with **Current photo** selected. Alternate gallery photos are used only after you make one the main photo. Click a **Cutout** to choose it as the main photo, then save and continue, or choose **Save and close** to finish this batch and exit. Each new batch opens at the top. Photos left on **Current photo** will not be suggested in Tidy photos again. Originals remain available, and you can retry background removal from an individual piece page. Failed removals can still be retried later.

### Set up background removal

You or your local AI assistant can set up photo tools once. Imports and background removal share their own Python environment, separate from your system packages. From the app folder, use Python 3.11–3.13 and your existing wardrobe data folder:

```bash
python3.12 tools/setup_photos.py --data ../closet-lint --background
```

On Windows, use `py -3.12` instead of `python3.12`. Adjust the version if you installed 3.11 or 3.13.

Setup needs an internet connection and downloads a model and supporting software. Allow extra disk space and memory. Afterward, processing stays on your computer, with no paid AI service required. Refresh the app when setup finishes. Your phone can use the same tool through the running app.

Already set up background removal? Your existing environment still works, and photo imports can use it automatically. Rerunning setup reuses a compatible environment and a verified existing model. Repeat setup after moving to another computer.

## If something looks wrong

- **Part of the piece disappeared:** discard the result. Lace, fine jewelry, and sheer or dark fabric can be difficult; keeping the original is fine.
- **The model is still there:** background removal keeps the photographed subject, including anyone wearing the piece.
- **Your closet still shows the old photo:** select the new view and choose **Make main photo**.
- **Removal is unavailable or fails:** run `python3 tools/check_setup.py --data ../closet-lint` (on Windows, use `py -3`). It checks the photo environment and model and prints the setup command if needed. Regular photo uploads work without this tool.

Full backups include all saved photo versions. For help adding photos through your assistant, see [AI assistant imports](ASSISTANT-IMPORT.md).

Warm previews are indexed in memory after the background worker checks their source bytes. Once indexed, thumbnail requests read the preview directly, without loading or hashing the full-size original. The index is disposable: restarting rebuilds it from the existing preview files, and restoring a wardrobe clears it before new requests reuse previews. Cold or unavailable previews retain the bounded wait and original-photo fallback.

You can also select a piece on the outfit board and choose **Remove background**, including in a collage window. Review the result before accepting it. Accepting makes the cutout the piece’s main photo everywhere; switch back to the original from the piece page whenever you like.

Photo-derived swatches live inside **Photo options** on the piece page. Open it to adjust or sample colors; the existing save and Undo behavior is unchanged. The disclosure also contains the framing, replacement, crop, and optional background-removal controls.

## Care-label references

Open **Care** on a piece page and choose **Add care-label photo**, or classify an existing gallery view as **Care label** in Photo options. A label photo alone is enough; Washing, Drying, and Care note are optional and save with the piece form. Photo uploads save immediately and retain other unfinished form entries.

Care labels can be enlarged from Care or the gallery. They stay out of main garment photos, board images, swatch sampling, photo cleanup, and background removal. Changing the main view to Care label selects another garment view, or the usual no-photo placeholder. Labels count toward the existing 12-photo limit and travel with full backups. **Remove photo** offers Undo and retains the underlying image asset.

Tidy photos skips a main photo that is already a cutout. If you switch the main photo while a tidy batch is being reviewed, saving that stale result is blocked; reopen Tidy photos to use the new main photo.


## Product photos during bulk import

Under Prepare your pieces, select **Create an individual product photo for each piece** for emails, links, exports, or uploaded photos. Combine it with **Separate multipacks into individual pieces** to request a separate record and image for every confirmed pack member. Record splitting by itself keeps the source photo. Shoes, socks, gloves, and earrings remain normal pairs.

The assistant uses its available image editor and asks for any additional access. Originals stay available; successful new product views are labeled recast and become the main view. If editing is unavailable, declined, or fails, the original is kept and the reason appears with the import result. For uploads, change an individual photo checkbox or supply brief guidance about details to preserve. There is no separate photo-splitting control, automatic recoloring of model photos, or new alternate-view uploader.
