# Getting started

This guide covers running Closet Lint on your computer and opening it in your web browser. Your wardrobe and photos are saved on that computer. For access away from home, see the [experimental hosting notes](WEB-HOSTING.md); hosting has additional requirements and is not yet a generally supported installation option.

## Run with Docker

### Try the Docker preview

The Docker preview runs Closet Lint 0.5.0 with experimental Docker packaging. You need Docker Desktop running, or Docker Engine with Compose. You do not need Python, Git, or the app source. Intel/AMD computers and Apple Silicon/ARM computers use the same file and commands.

1. Create a folder named `closetlint-preview`.
2. Download [the preview Compose file](https://raw.githubusercontent.com/stephthegeek/closetlint/codex/docker-preview-0.5.0.1/compose.preview.yaml) into that folder and name it **compose.yaml**. Make sure it is not saved as `compose.yaml.txt`.
3. Open a terminal in that folder and run:

   ```sh
   docker compose pull
   docker compose up -d --wait
   docker compose exec closetlint python runtime/background_worker.py --prepare
   ```

4. Wait for the downloads to finish, then open **http://localhost:6684** and set up your closet. Background removal is ready to use.

This first setup downloads the app image and background removal models. The models stay saved in your Docker volume, so you do not need to download them again each time you start the app.

Stop the preview with `docker compose stop`. Start it again with `docker compose up -d`. Run these commands from the same folder. Your pieces and photos stay in a separate Docker volume when you stop or replace the container. Use **Export backup** to keep a copy outside Docker. Avoid `docker compose down -v`, which deletes the saved wardrobe.

The preview opens only on this computer. If port 6684 is already in use, stop the other Closet Lint instance or change `127.0.0.1:6684:6684` to `127.0.0.1:6685:6684` in compose.yaml and open **http://localhost:6685** instead. For startup problems, run `docker compose logs --tail=100 closetlint`.

### Build from source

Docker is an alternative to installing Python and photo libraries yourself. Install [Docker Desktop](https://docs.docker.com/get-started/get-docker/) or Docker Engine with Compose, then run these commands from the Closet Lint source folder:

```sh
docker compose up -d --build --wait
docker compose exec closetlint python runtime/background_worker.py --prepare
```

Wait for the build and model downloads to finish, then open **http://localhost:6684**. Background removal is ready to use. Docker runs the app in the background. Stop it with `docker compose stop`; start it again with `docker compose up -d`. To inspect startup problems, use `docker compose logs closetlint`.

Your wardrobe, photos, unfinished assistant requests and downloaded models live in the separate `wardrobe` Docker volume. Recreating the container keeps that volume. Use **Export backup** and keep a copy outside Docker. To move an existing wardrobe, start with the new Docker volume and use **Restore backup**; keep your original data folder and stop the original app first. Do not run two instances against the same storage. Commands that delete volumes, including `docker compose down -v`, delete that saved storage.

Photo libraries are included, and the setup commands download the background removal models. Models stay in the volume through restarts and app updates. Docker starts with access from this computer only; phone or public server access needs separate network and access protection configuration.

For AI assistant imports, the download/upload route works normally. Direct access requires your AI assistant to have explicitly authorized access to run commands inside this container. Paths such as `/data` are inside Docker. For example, an authorized assistant can run a command using `docker compose exec -T closetlint python tools/check_setup.py --data /data`; it must still verify the wardrobe and request identity. Docker does not give an AI assistant access automatically. See [AI assistant imports](AI-ASSISTANT.md).

To update a source build, export a backup, replace the source folder while keeping the Compose project name and volume, then run `docker compose up -d --build`. Refresh and verify your wardrobe. Keep the same containing folder name so Compose selects the same volume.

## Start the app

You’ll need Python 3.10 or newer, a web browser, and the downloaded Closet Lint folder. Python isn’t included on every computer. Check with `python3 --version` on Linux or macOS, or `py -3 --version` on Windows. If it isn’t installed, [download Python](https://www.python.org/downloads/). Python 3.13 is suitable for both the app and its optional photo tools.

1. Unzip the download.
2. Open a terminal in the extracted folder—the one containing `app`, `runtime`, and `tools`.
3. Run the command for your computer:

   **Linux or macOS**

   ```bash
   python3 runtime/server.py --data ../closet-lint
   ```

   **Windows**

   ```powershell
   py -3 runtime\server.py --data ..\closet-lint
   ```

4. Open **http://127.0.0.1:6684/** in your browser. Follow the setup prompts, then add your first piece.

Keep the terminal open while using the app. Press **Ctrl+C** to stop it, and use the same command to start again. Saved pieces and photos stay in `closet-lint`, separate from the app folder. Keep the extracted app folder’s original name; the command uses a separate folder beside it for your wardrobe. These example paths are for new installations. Existing wardrobes should keep using their current `--data` path.

Installation has been checked on Linux. The Windows and macOS commands are provided, but installation on those systems has not been tested.

## First setup

Open Closet Lint and follow the optional setup steps. You can return through **Menu → Utilities → Getting started**.

1. **My closet:** choose its name and whether to show Linty’s logo.
2. **Preferences:** choose units and an emoji pack.
3. **Categories:** choose which categories appear when adding pieces. Starter choices are already selected; categories containing your pieces stay available.
4. **Pieces & photos:** add a piece, import with your own AI assistant, restore a backup, or browse first.

A photo and a name are enough to start. Add details when they are useful to you. Sizes, measurements, purchase dates, and prices can remain unknown. Acquisition dates can be a year, month, or exact day, and can be marked approximate.

Closet details and category choices save with your wardrobe and its backups. Display preferences save separately in each browser. Change either later in **Menu → Settings**. Use **Show all categories…** while adding a piece to choose a category outside your starter list.

## Optional: try the sample collection

To try the app with 12 sample pieces and an outfit already added, run:

```bash
python3 tools/create_demo.py --data ../closet-lint-sample
python3 runtime/server.py --data ../closet-lint-sample --port 6685
```

On Windows, use `py -3` instead of `python3`. Open **http://127.0.0.1:6685/**. The sample uses its own folder and won’t replace your wardrobe.

## Optional: use your phone

Your computer needs to stay awake, with the app running. Connect your phone to the same home Wi-Fi.

1. Stop the server with **Ctrl+C**.
2. Find your computer’s Wi-Fi IP address in its network settings.
3. Run the following, replacing `10.0.0.20` with that address:

   ```bash
   python3 runtime/server.py --data ../closet-lint --lan-ip 10.0.0.20
   ```

   On Windows, use `py -3` instead of `python3`.
4. Open the address printed in the terminal on both your phone and computer.

For Sky, **Save image** downloads a picture you can share from Photos or Gallery. The direct **Share** action depends on browser support and a secure HTTPS address, so it may be unavailable at your ordinary home network HTTP address.

Anyone who can reach that address can view and edit the wardrobe. Use a home network you trust, and don’t expose it to the public internet. Finish and save edits before switching devices; changes are not merged automatically.

## Backups

Choose **Menu → Utilities → Export backup** and keep a copy somewhere separate. To restore it, choose **Restore backup**. Restoring replaces the destination wardrobe, so check the preview first.

See [updating and moving](GETTING-STARTED.md#updating-and-moving) before replacing app files or changing computers.

## Check your setup

If you're unsure what's installed, run this from the app folder:

```bash
python3 tools/check_setup.py --data ../closet-lint
```

On Windows, use `py -3` instead of `python3`. The check shows whether the app and optional photo tools are ready, with commands for the next step. It doesn't install anything or change your wardrobe. Missing optional photo tools don't prevent normal use.

## Troubleshooting

- **Python not found:** install Python, reopen the terminal, and try again.
- **Address already in use:** stop the earlier server, or add `--port 6685` and open the address it prints.
- **Phone won’t connect:** check that both devices use the same Wi-Fi and that your computer’s firewall allows the connection.
- **Can’t save:** check that the server is running and the disk has free space. Preserve unsaved work before refreshing.

Run only one server for each data folder. Open the address from the terminal rather than opening the app’s HTML file directly.

## Optional photo tools

Normal photo uploads work without background removal. Optional previews and AI assistant photo imports share a photo environment on the computer or server running Closet Lint.

From the app folder, use Python 3.11–3.13 with your existing wardrobe data folder. For example:

```bash
python3.12 tools/setup_photos.py --data ../closet-lint --background
```

On Windows, use `py -3.12` instead of `python3.12`. Adjust the version to one you have installed. Omit `--background` if you only need previews and assistant photo import.

Setup downloads supporting software and, for background removal, a model. Processing then runs on your wardrobe computer or server. Hosted installations need permission and enough resources for these tools; follow the [hosting notes](WEB-HOSTING.md). Your phone uses the same installed tools through the app.

For readiness checks, run `python3 tools/check_setup.py --data ../closet-lint` (on Windows, use `py -3`). It reports next steps without installing anything or changing pieces. Optional smaller browse previews are generated automatically when the tools are available; saved photos remain in the backup.

## Updating and moving

Save your work and export a full backup. Stop the app, replace its code while keeping your wardrobe data folder, and start it with the same `--data` path. Refresh and check your pieces and photos. For hosting, also retain the existing hosting settings and access protection.

To move computers, restore a full backup into a new wardrobe and verify it before removing the original. Browser preferences and optional photo tools need separate setup. Contributor recovery checks are covered in [release preparation](../CONTRIBUTING.md#release-preparation).

For everyday features, see [Using Closet Lint](USING-CLOSET-LINT.md). For bulk imports, product photo requests, and Oracle conversations, see [AI assistant imports and Oracle](AI-ASSISTANT.md).
