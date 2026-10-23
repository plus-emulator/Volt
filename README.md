# Volt

Volt is the web client of a Habbo Hotel: the screen where players walk, chat and decorate. It is written in React 19 and TypeScript and built on [Volt-Renderer](https://github.com/plus-emulator/Volt-Renderer). It works with the [PlusEMU](https://github.com/plus-emulator/PlusEMU) server.

Volt started as a fork of Nitro React and is developed on its own.

Full guides are on the documentation site: <https://docs.plusemu.dev/getting-started/volt-client/>

## Setup

The easiest way is the PlusEMU [installer](https://docs.plusemu.dev/getting-started/installation/). It installs Volt for you.

To install Volt by hand:

1. Download `volt-client.zip` from [Releases](https://github.com/plus-emulator/Volt/releases) and unzip it into your web server folder.
2. In the `configuration/` folder, copy these files:
   - `renderer-config.json.example.json` to `renderer-config.json`
   - `ui-config.example` to `ui-config.json`
   - `client-mode.example` to `client-mode.json`
3. In `renderer-config.json`, set `socket.url` to your PlusEMU WebSocket address, for example `ws://127.0.0.1:2096`. Use `wss://` on a live server.
4. Open the client with a login ticket: `index.html?sso=TICKET`. Your website normally does this.

See [Set up the Volt client](https://docs.plusemu.dev/getting-started/volt-client/) for all settings and for building from source.

## Update

If you used the installer, run `sudo plusemu-update` (Linux) or `plusemu-update` (Windows).

To update by hand:

1. Back up your `configuration/` folder.
2. Download the new `volt-client.zip` and replace the old files. Keep your own configuration files.
3. Compare your files with the new `.example` files, and add any new settings.
4. Reload the hotel page.

Update PlusEMU and Volt together.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[GPL-3.0](LICENSE).
