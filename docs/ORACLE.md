# Closet Oracle

**Ask the Oracle** prepares a read-only wardrobe-analysis handoff for the user's own assistant. It does not run an AI conversation, require an API key, import results, or change wardrobe data.

Open it from the hamburger menu, selected-piece actions, or a collection. The two-screen sheet reuses setup/import form styles in all three themes. The question is optional; starters append to it rather than replacing what the user wrote.

## Scope and sharing

The menu starts with owned pieces from the whole closet. Selected-piece and collection actions preselect that scope. Wishlist inclusion is optional and off by default. Stashed pieces remain owned and carry their availability status. Above 150 pieces, choose a smaller scope or explicitly keep the larger group text only.

The dated Markdown context contains stable piece IDs, titles, categories, current tags, ownership, and relevant garment constraints. Missing tags are labeled “None listed”; they are not treated as proof that a property is absent. Notes and titles are quoted data, with Markdown fences escaped.

Saved outfits, exact wear dates, sizes, purchase details, and notes are separate opt-ins. Outfits are included only if all of their pieces are in scope. Measurements, working boards, account information, credentials, and unrelated records are not included. Compact copied text intentionally excludes all optional sections and photos.

Photos are optional real image-file downloads, limited to the main photos of 12 pieces. Filenames include the corresponding piece IDs. The user attaches them in the assistant chat. Download requests do not prove that the browser saved every file, that the files were attached, or that an assistant received them. The interface reports failures and offers retry or text-only sharing. Each photo read has a 30-second deadline covering the response and image body. Close remains available during photo preparation; closing stops the current read and prevents later downloads from being requested. It cannot undo a download already requested.

## Assistant routes

The chat route downloads context and copies an opening prompt, with selectable text if clipboard access fails. It works with browser-local wardrobes, including demos. The local route is offered only for installations using the local runtime. It copies read-only folder instructions with scoped IDs and optional fields, rather than copying wardrobe records. Folder permissions may allow more access than the instructions request; users must explicitly authorize their own assistant.

Both routes give analysis and advice only. Nothing returns to Closet Lint. No service is contacted automatically, and Closet Lint cannot observe the assistant's progress.

The in-app capability guide names Codex in a local workspace and Claude Code as local examples. Regular ChatGPT, Claude, or another chat may accept attachments or pasted text. Tool permissions and upload limits matter; subscription names alone do not establish local folder access.

## Local handoff memory

After an output is prepared and Done is clicked, the browser may store only the date, count, and scope metadata under `closetlint.oracle-handoff.v1`. A collection ID can identify a previous scope. Questions, piece IDs, titles, images, notes, and conversation content are not stored there. Cancel does not create a handoff record. A fresh-snapshot option explains that later edits are absent from an old file, without claiming to have detected every change.

## Implementation and future hosting

`app/scripts/oracle.js` separates pure scoped context/prompt builders from browser UI, clipboard, and download operations. `tools/sync_oracle.py` embeds the script and `app/styles/oracle.css` in the portable app; `--check` verifies synchronization. Synthetic tests cover sharing boundaries, read-only behavior, route gating, clipboard failures, downloads, partial photo failures, scope limits, and refresh metadata.

A future hosted AI service could consume the same explicitly prepared context. That would require a separate authenticated backend, per-user authorization, private storage, provider adapters, protected credentials, request limits, and clear data-sharing choices. A bring-your-own-key design must not embed user or operator secrets in the public app, public demos, exports, or source packages. No hosted service, account system, API integration, or key storage is implemented by this feature.
