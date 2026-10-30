# Themes and display preferences

Open **Menu → View settings** to choose how Closet Lint looks. These settings change the interface, not your wardrobe data.

- **Soft Hardware:** monospace controls, pixel accents, lavender highlights, and muted green surfaces.
- **Field Notes:** warm paper colors, serif headings, and softer handwritten accents.
- **Night Bloom:** expressive serif headings, arched photo frames, and muted plum colors.

Each theme supports light, dark, and system appearance. Thumbnail size is a separate setting. Clothing and outfit titles use readable text rather than the pixel heading font.

## Icons and labels

Under **Icons**, choose an **Emoji pack** and **Emojis + text** or **Text only** for menu and toolbar labels. With emojis enabled, compact mobile navigation and some toolbars use icons to save space; text-only keeps text on mobile, too. Standalone action symbols remain where they are the control itself.

Emoji packs adjust interface emoji appearance. Development builds also include an experimental **Emoji tweaks [remove for launch]** section; it is not a permanent setting. These settings do not recolor garment photos. Photo badges, including wishlist and wear-more markers, convey piece information separately from menu labels.

## Photos and favorites

Model and scene photos fill their frames with cropping. Isolated items and transparent cutouts show the whole piece. Choose the saved main photo on the piece page; see [photo controls](PHOTOS.md).

**Photo background → Off-white** adds a consistent, theme-matched canvas behind transparent photos. It does not edit the saved image. Thumbnail size changes the browse density separately.

Favorites have theme-specific controls: a pixel heart in Soft Hardware and a softer heart/“love!” treatment in Field Notes. Size labels remain separate from favorite controls.

## Where preferences are saved

Theme, appearance, emoji, and thumbnail preferences are saved in this browser. They do not sync between devices and are not included in wardrobe backups. Changing the app’s address can give you a separate set of browser preferences.

**Reset display preferences** restores visual defaults. It keeps your custom **Fits like reference**, pieces, photos, outfits, and wear history. The Fits like reference is a label; changing it does not convert sizes. Resetting display preferences is separate from restoring or resetting wardrobe data.

For stylesheet maintenance and checks, see [developer testing notes](TESTING.md).

## For contributors: icon and theme maintenance

Control emoji choices are defined in `app/scripts/control-icons.js` and embedded with `python3 tools/sync_control_icons.py`. The packs offer feminine, masculine, or neutral/symbolic scientists, setup wizards, and trip fairies, including dynamically created controls. Garment and category data is unchanged. Wishlist section labels use medals and stars to distinguish ranking groups.

## Interaction states for new controls

Every new interactive component needs visible hover, keyboard focus, and pressed/selected feedback where applicable. Reuse the existing button/link styles when possible; custom cards, text links, and disclosure summaries need their own states. Keep hover changes within hover-capable fine-pointer media queries, make focus visible without relying only on color, use theme variables for light/dark skins, avoid layout shifts, and honor reduced-motion preferences. Include these states in visual review instead of checking only the resting appearance.

## Sky palette

Soft Hardware retains its original observatory colors. Other skins map Sky’s semantic color variables to the active theme’s background, panel, text, border, and selection colors; system appearance resolves through the same base theme variables. Night Bloom therefore uses plum and mauve in dark appearance and blush and plum in light appearance, while Field Notes follows its parchment/earth palette. The chart’s radial glow and muted house labels derive from these colors. Share exports continue to use the base theme palette. Scoring, star brightness levels, and animations are unchanged.
