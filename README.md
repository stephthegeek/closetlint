# Closet Lint

A wardrobe goblin who lives in your closet and knows where everything is.

Browse everything you own (or are scheming to own), drag pieces around an outfit board until something clicks, and rate the outfits it dreams up for you: love it, meh, absolutely not. It learns your taste from those ratings, ranks your wishlist by how much it would actually earn its keep in your closet, and helps you plan trips and packing lists.

**0.1 release candidate.** Final mobile testing is in progress.

## How to run Closet Lint on your computer

You need Python 3.10 or newer and a web browser. No account or AI subscription is needed.

1. Download and unzip the Closet Lint source folder.
2. Open a terminal in that folder and run:

   ```bash
   python3 runtime/server.py --data ../closet-lint-data
   ```

   On Windows, use `py -3` instead of `python3`.
3. Open **http://127.0.0.1:6684/** in your browser and follow the setup prompts.

That’s it. Time to give Linty something to rummage through.

Keep the terminal open while using the app. To stop, press **Ctrl+C**; run the same command to start again. Your saved wardrobe stays in the separate `closet-lint-data` folder.

For help with installation, trying the sample collection, or opening the app on your phone over home Wi-Fi, see [the installation guide](docs/INSTALL.md).

## Optional features

### Using your own AI assistant

You can give your AI assistant product links, order emails, screenshots, or photos and ask it to prepare pieces for your wardrobe or wishlist. With access to your computer, it can also add the pieces and photos directly to Closet Lint. You choose which tools and information it can use; Closet Lint doesn’t connect to your inbox itself.

Suggested prompts are in **Menu → Utilities → Import pieces**. See [AI assistant imports](docs/ASSISTANT-IMPORT.md) for setup and examples.

### Photos

Each piece can have several photos, and you choose which one appears in your closet. You can also install a local background-removal tool. It keeps the original and lets you review the result before saving. No paid AI service is needed. See [photo options and setup](docs/PHOTOS.md).

## Documentation

- [Installation, phone access, and troubleshooting](docs/INSTALL.md)
- [Updating and moving your wardrobe](docs/UPDATING.md)

## AI Use & Security

[![Proudly Vibe Coded - Aurora Pulse](https://vibecoded.fyi/badges/terminal/main/proudly-vibe-coded-aurora-pulse.svg)](https://vibecoded.fyi/)

Claude and Codex generated substantial portions of the code, tests, and documentation, with StephTheGeek directing the product, design, and hands-on testing. Here we describe how it was built, what was checked, and what remains unverified.

Automated tests cover imports, backup and restore, navigation, and unsafe inputs. Dependency checks, secret scanning, and an AI-assisted security review have also been run. There has not been an independent human security audit. See [AI use and security review](AI-USE-AND-SECURITY.md) and [security information and private reporting](SECURITY.md).

## License

The code, documentation, and Linty artwork are **GPL-3.0-or-later**. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Third-party components retain their own licenses; your wardrobe data and photos are not automatically relicensed.

## Development

The frontend is in `app/`, the Python server is in `runtime/`, and command-line helpers are in `tools/`. No frontend build is needed to run the app. Developers can run `npm test` with Node/npm and Python installed.

See [developer checks](docs/TESTING.md), [runtime details](docs/LOCAL-RUNTIME.md), and [dependencies and assets](docs/THIRD-PARTY.md).
