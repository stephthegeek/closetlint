# Closet Oracle

**Ask the Oracle** prepares a read-only wardrobe-analysis handoff for the user's own assistant. It does not run an AI conversation, require an API key, import results, or change wardrobe data.

Open it from the hamburger menu, selected-piece actions, or a collection. The dedicated page reuses setup/import form styles in all three themes. The question is optional; starters append to it rather than replacing what the user wrote.

## Scope and sharing

The menu starts with owned pieces from the whole closet. Selected-piece and collection actions preselect that scope. Wishlist inclusion is optional and off by default. **Exclude Off-duty and intimates** starts checked for every new request, including selected-piece and collection scopes. It omits swimwear, loungewear, activewear, costumes, underwear, lingerie, and bralettes; uncheck it to include them. The sharing count, photo choices, assistant request, and download all use the same filtered scope. Stashed pieces remain owned and carry their availability status. Above 150 pieces, choose a smaller scope or explicitly keep the larger group text only.

The dated Markdown context contains stable piece IDs, titles, categories, current tags, ownership, and relevant garment constraints. Missing tags are labeled “None listed”; they are not treated as proof that a property is absent. Notes and titles are quoted data, with Markdown fences escaped.

Saved outfits, exact wear dates, trips, sizes, purchase details, and notes are separate opt-ins in a group that starts collapsed. Outfits are included only if all of their pieces are in scope. Trips share saved names, destinations, dates, weather, and travel settings, with packing references limited to the selected pieces; trip notes require the Notes opt-in too. Unsaved trip drafts are not included. Measurements, working boards, account information, credentials, and unrelated records are not included. Compact copied text intentionally excludes all optional sections and photos.

Photos are optional real image-file downloads, limited to the main photos of 12 pieces. Filenames include the corresponding piece IDs. The user attaches them in the assistant chat. Download requests do not prove that the browser saved every file, that the files were attached, or that an assistant received them. The interface reports failures and offers retry or text-only sharing. Each photo read has a 30-second deadline covering the response and image body. Close remains available during photo preparation; closing stops the current read and prevents later downloads from being requested. It cannot undo a download already requested.

## Assistant routes

The chat route downloads context and copies an opening prompt, with selectable text if clipboard access fails. It works with local installations, hosted wardrobes, and browser-only demos.

Local installations also offer **Use my local assistant**, with a **Local access verified** badge when an existing import setup marker matches the wardrobe identity and current app/data folders. This is prior setup evidence, not a live connection or proof that the current assistant session has permission. Photo-import dependencies are not required. **Recheck access** refreshes that evidence; errors leave the download route available. Without prior setup evidence, the local request remains available and checks identity before reading.

**Prepare local request** (or **Prepare hosted request**) saves the explicitly selected browser snapshot under the data folder’s `oracle-requests/<request>/context.json`, with private file permissions. It includes the question and only the chosen pieces and optional fields. Optional prepared photos are copies of up to 12 listed main photos; no photo access happens for text-only requests. These are private handoff files, not wardrobe records. They are not included in full wardrobe backups and can be deleted when the conversation no longer needs them. Later wardrobe edits require a newly prepared snapshot.

**Copy request for my assistant** includes the exact computer, folders, wardrobe identity, and a supported `tools/read_oracle.py` command. That reader opens SQLite with `mode=ro` and `query_only` solely to verify identity, then prints the scoped snapshot and authorized photo paths. It never initializes a wardrobe, migrates data, writes records, or searches for a different installation. It does not ask the assistant to reconstruct records from app source or inspect the whole database. Existing assistant folder permissions may be broader; the request limits its use to this context.

Both routes give analysis and advice only. Nothing returns to Closet Lint. No AI service is contacted automatically, and Closet Lint cannot observe the assistant's progress. Status distinguishes access evidence, a prepared request, and a successful clipboard copy; it never calls those “running” or “complete.” On a phone, the direct route requires an already configured way to use an assistant with access to the wardrobe computer or server; downloads remain available.

The in-app capability guide names Codex in a local workspace and Claude Code as local examples. Regular ChatGPT, Claude, or another chat may accept attachments or pasted text. Tool permissions and upload limits matter; subscription names alone do not establish local folder access.

## Local handoff memory

After an output is prepared and Done is clicked, the browser may store only the date, count, and scope metadata under `closetlint.oracle-handoff.v1`. A collection ID can identify a previous scope. Questions, piece IDs, titles, images, notes, and conversation content are not stored in that browser reminder. Explicitly prepared assistant handoff files do contain the chosen question and context, as described above. Cancel does not create a handoff record. A fresh-snapshot option explains that later edits are absent from an old file, without claiming to have detected every change.

## Implementation and future hosting

`app/scripts/oracle.js` separates pure scoped context/prompt builders from browser UI, clipboard, and download operations. `tools/sync_oracle.py` embeds the script and `app/styles/oracle.css` in the portable app; `--check` verifies synchronization. Synthetic tests cover sharing boundaries, read-only behavior, route gating, clipboard failures, downloads, partial photo failures, scope limits, and refresh metadata.

A future hosted AI service could consume the same explicitly prepared context. That would require a separate authenticated backend, per-user authorization, private storage, provider adapters, protected credentials, request limits, and clear data-sharing choices. A bring-your-own-key design must not embed user or operator secrets in the public app, public demos, exports, or source packages. No hosted AI service, account system, API integration, or key storage is implemented by this feature.

## Hosted wardrobes

The download route works from a hosted wardrobe, including on a phone. Attach downloaded context and any selected photos to the AI conversation; the website login does not give that conversation server access.

The direct route requires an assistant with an already approved SSH connection to the hosting server. Oracle identifies the hosted address, server folders, and wardrobe instance, and supplies one read-only command. Run it on that server. The installation check confirms the wardrobe’s setup, not the assistant’s connection, so hosted wardrobes default to downloads even when setup was previously verified. Missing access must not fall back to a different local wardrobe. Selected photo files can be read or transferred only through that approved connection.

Preparing context writes private request files beside the hosted wardrobe, without changing garment records. Responses stay in the assistant conversation. Password protection can remain enabled.
