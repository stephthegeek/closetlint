# Closet Lint 0.2.0

**Easier imports, a Closet Oracle, and clearer taste insights.**

Bring more of your wardrobe into Closet Lint, take your questions to your own AI assistant, and explore the outfits behind your taste patterns.

## What's new

- **A clearer start, and easier repeat imports.** Add pieces by hand, restore a backup, or prepare a request for your own assistant. An assistant with access to your wardrobe folder can use the supported importer; a regular chat can return a file or JSON text for you to review in Closet Lint. Recent-order requests include the stores and dates you choose. Closet Lint does not search your email or control your browser.
- **🔮 Ask the Oracle.** Choose your whole closet, a collection, or selected pieces, then prepare a wardrobe summary and question for your own AI assistant. Sizes, notes, purchase details, wear dates, and saved outfits are optional. You can also download up to 12 main photos to attach. The Oracle prepares the context; the conversation takes place in your assistant.
- **My taste, with the evidence.** Patterns count each distinct outfit once and follow your pieces' current tags and ratings. See Loved, Liked, and Passed counts, then open the actual rated outfits behind a pattern. Patterns, favorite pieces, Favorites, and pairs that don't work now have pages, so longer lists stay manageable.
- **More comfortable photo cleanup.** Tidy photos supports whole categories and subcategories, shows which photos are waiting or processing, and lets you choose ready results while later photos prepare. Each batch starts at the top. Save and continue or Save and close, with one clear count of the cutouts you are keeping. Originals remain available. Keeping an original skips it in future bulk runs; uploading a new photo makes the piece eligible again.
- **View settings in one place.** Find theme, thumbnail, icon, and photo-canvas choices in the menu. Reset display preferences without resetting your wardrobe or custom Fits like label. The storage guidance explains what belongs to this browser and what is saved in the local wardrobe.
- **Friendlier optional photo setup.** A read-only setup check explains what is ready and what needs attention. Photo imports and background removal can share an isolated Python environment, including a compatible environment you already set up. Missing photo tools do not prevent normal app use.

## Fixes and refinements

- Import review makes possible matches, wishlist-to-owned changes, missing photos, and actual saves explicit. Ownership changes keep existing photos and tags. A failed batch stops safely, and retry keeps completed saves and uploaded photos within the open review session.
- Stalled import and Oracle photo downloads time out after 30 seconds. Oracle can close during photo preparation, and failed downloads offer a way to retry or continue without photos.
- Taste analysis reuses one fresh statistics pass when comparing candidate outfits, while still reflecting later tag and rating edits.
- Refined sidebar controls, photo canvases, saved-outfit filters, button sizing, and menu labels. Stretch uses single-choice chips, bulk selection survives navigation, and Accessorize preserves suggested shoes.

## Updating from 0.1

1. Save open edits, then choose **Menu → Utilities → Export backup**. Keep that ZIP and the old app folder until you have checked the update.
2. Stop the server, and extract 0.2 into a new app folder.
3. Start the new version with the same existing wardrobe data folder. Use an absolute `--data` path if the new app folder changes where a relative path would point.
4. Refresh the browser, check your pieces and photos, and try another backup.

You do not need to export and reimport individual pieces for an ordinary app update. Run only one server against a wardrobe at a time. See [the update guide](UPDATING.md) for moving computers and safe rollback.

## Requirements and limits

The core app still needs Python 3.10 or newer and a web browser. No account, AI subscription, or npm installation is required for normal use. Optional photo tools have separate dependencies; use the [setup check](INSTALL.md#check-your-setup) and [photo guide](PHOTOS.md).

An AI assistant is optional and separate from Closet Lint. Email connections, local file access, attachment support, and usage limits depend on the assistant you choose and the permissions you give it. A paid subscription alone does not grant access to your wardrobe folder.

Installation, imports, updates, and backup/restore have been checked on Linux with synthetic wardrobes. Windows and macOS installation remain unverified. Automated tests and security checks do not replace an independent human security audit. See [testing and verification limits](TESTING.md) and [security guidance](../SECURITY.md).

The local app has no login. Keep it on your computer or a trusted home network, and do not expose its port to the public internet. Public-demo changes stay in the visitor's browser. Background removal can lose fine details, so review the result before keeping it.
