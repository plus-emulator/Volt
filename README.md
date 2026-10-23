# Volt

Volt is a web client for Habbo Hotel servers, written in React 19 and TypeScript on top of [Volt-Renderer](https://github.com/plus-emulator/Volt-Renderer). It is the client for [PlusEMU](https://github.com/plus-emulator/PlusEMU). Volt began as a fork of Nitro React and is now developed independently.

Documentation: <https://docs.plusemu.dev/getting-started/volt-client/>

## Setup

Use the PlusEMU [installer](https://docs.plusemu.dev/getting-started/installation/), or install a release manually.

Manual installation:

1. Download `volt-client.zip` from [Releases](https://github.com/plus-emulator/Volt/releases) and unzip it into your web server folder.
2. In the `configuration/` folder, copy these files:
   - `renderer-config.json.example.json` to `renderer-config.json`
   - `ui-config.example` to `ui-config.json`
   - `client-mode.example` to `client-mode.json`
3. In `renderer-config.json`, set `socket.url` to your PlusEMU WebSocket address, for example `ws://127.0.0.1:2096`. Use `wss://` on a live server.
4. Open the client with a login ticket: `index.html?sso=<ticket>`. The website issues the ticket.

See [Set up the Volt client](https://docs.plusemu.dev/getting-started/volt-client/) for all settings and for building from source.

## Update

If you used the installer, run `sudo plusemu-update` (Linux) or `plusemu-update` (Windows).

Manual update:

1. Back up your `configuration/` folder.
2. Download the new `volt-client.zip` and replace the old files. Keep your own configuration files.
3. Compare your files with the new `.example` files, and add any new settings.
4. Reload the hotel page.

Update PlusEMU and Volt together.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[GPL-3.0](LICENSE).
