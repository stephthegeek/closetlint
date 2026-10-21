# Install Closet Lint

Closet Lint runs on your computer and opens in your web browser. Your wardrobe and photos are saved on that computer.

## Start the app

You’ll need Python 3.10 or newer, a web browser, and the downloaded Closet Lint folder.

1. Unzip the download.
2. Open a terminal in the extracted folder—the one containing `app`, `runtime`, and `tools`.
3. Run the command for your computer:

   **Linux or macOS**

   ```bash
   python3 runtime/server.py --data ../closet-lint-data
   ```

   **Windows**

   ```powershell
   py -3 runtime\server.py --data ..\closet-lint-data
   ```

4. Open **http://127.0.0.1:6684/** in your browser. Follow the setup prompts, then add your first piece.

Keep the terminal open while using the app. Press **Ctrl+C** to stop it, and use the same command to start again. Saved pieces and photos stay in `closet-lint-data`, separate from the app folder.

Installation has been checked on Linux. The Windows and macOS commands are provided, but installation on those systems has not been tested.

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
   python3 runtime/server.py --data ../closet-lint-data --lan-ip 10.0.0.20
   ```

   On Windows, use `py -3` instead of `python3`.
4. Open the address printed in the terminal on both your phone and computer.

Anyone who can reach that address can view and edit the wardrobe. Use a home network you trust, and don’t expose it to the public internet. Edit on one device at a time so changes don’t overwrite each other.

## Backups

Choose **Menu → Utilities → Full backup (data + photos)** and keep a copy somewhere separate. To restore it, choose **Restore a full backup**. Restoring replaces the destination wardrobe, so check the preview first.

See [updating and moving your wardrobe](UPDATING.md) before replacing the app files or changing computers.

## Troubleshooting

- **Python not found:** install Python, reopen the terminal, and try again.
- **Address already in use:** stop the earlier server, or add `--port 6685` and open the address it prints.
- **Phone won’t connect:** check that both devices use the same Wi-Fi and that your computer’s firewall allows the connection.
- **Can’t save:** check that the server is running and the disk has free space. Preserve unsaved work before refreshing.

Run only one server for each data folder. Open the address from the terminal rather than opening the app’s HTML file directly.
