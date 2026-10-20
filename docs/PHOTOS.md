# Photos

You can keep several photos of a piece: on a model, laid flat, isolated, or a close-up. Upload your own, use screenshots, or ask your AI assistant to collect the available views from a product link.

## Offline clothes count too

Thrift-shop find? Hand-me-down? A mediocre phone photo + AI is enough to get a professional-looking, close enough result for your catalog.

If you want a cleaner product shot, upload it to an AI image editor and try:

> Turn this into a realistic product photo of the same garment, isolated on a plain white background. Keep its color, proportions, fabric texture, pattern, seams, and fastenings. Remove the surrounding clutter, and don't add details.

Add a few descriptors if needed, such as “fine ribbed cotton” or “deep burgundy.” Check the result against the real piece, though: generative editing can change details. Keep your original, and save the edited version as another photo. Plain white isn't transparent; the optional background remover below can make a cutout.

## Choose and display photos

Open a piece and expand **Photo options** to add another photo or make the selected view its main photo. The main photo appears in your closet; clicking a gallery thumbnail only changes the view you're looking at.

**Thumbnail framing** lets you show the whole photo or fill the frame with a crop. Model photos normally fill the frame; isolated pieces stay fully visible. Tap the large photo to enlarge it.

Each piece can have up to 10 photos, including background-removed versions. Saved images are limited to 1600 pixels on their longest edge, so keep your camera originals separately if you need full resolution.

## Optional: remove backgrounds

Background removal is optional and runs on the computer hosting Closet Lint. It keeps the original photo and creates a separate version with a transparent background. It doesn't redraw the garment or remove a person wearing it.

Choose **Remove background**, check the result, and select **Keep this version** or **Discard**. You can make the new version the main photo when keeping it.

For several pieces, open **Menu → Utilities → Tidy photos**. Choose a collection or another group, then review up to 12 pairs at a time. Select the results you like and choose **Keep selected**. Nothing is kept automatically, and originals remain available.

### Set up background removal

You or your local AI assistant can install the background-removal tool once. From the app folder, use Python 3.11–3.13 and your existing wardrobe data folder:

```bash
python3.12 tools/setup_background_removal.py --data ../closet-lint-data
```

On Windows, use `py -3.12` instead of `python3.12`. Adjust the version if you installed 3.11 or 3.13.

Setup needs an internet connection and downloads a model and supporting software. Allow extra disk space and memory. Afterward, processing stays on your computer, with no paid AI service required. Refresh the app when setup finishes. Your phone can use the same tool through the running app.

Repeat setup after moving to another computer. Re-run it if you set up background removal before the Pillow 13 update; the existing model can be reused.

## If something looks wrong

- **Part of the piece disappeared:** discard the result. Lace, fine jewelry, and sheer or dark fabric can be difficult; keeping the original is fine.
- **The model is still there:** background removal keeps the photographed subject, including anyone wearing the piece.
- **Your closet still shows the old photo:** select the new view and choose **Make main photo**.
- **Removal is unavailable or fails:** check setup finished, refresh, and try one photo. If necessary, restart the server. Regular photo uploads work without this tool.

Full backups include all saved photo versions. For help adding photos through your assistant, see [AI assistant imports](ASSISTANT-IMPORT.md).
