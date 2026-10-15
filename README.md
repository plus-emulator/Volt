# Volt

Volt is a Habbo Hotel client UI written in React 19 and TypeScript, built on [Volt-Renderer](https://github.com/plus-emulator/Volt-Renderer). It started as a fork of Nitro React and Nitro Renderer and is developed independently. It is the client for the [PlusEMU](https://github.com/plus-emulator/PlusEMU) emulator.

Highlights:

- Wired editors and creator tools modelled on the official AIR client, including variables, chests, room logs and the variables explorer
- Catalogue, inventory, navigator, groups, friends, camera, avatar editor, floor plan editor, mod tools, game center and more
- Split gamedata loading (core, custom and seasonal tiers) and JSON or JSONC configuration files

## Requirements

- Node.js 22 (`.nvmrc`; `package.json` requires `>=22.12.0`)
- Yarn 4 via Corepack (`corepack enable`; the version is pinned by `packageManager`)
- Git
- A Volt-Renderer checkout next to this repository
- A game server (for example PlusEMU) and the converted client assets

## Setup

### 1. Clone both repositories side by side

`vite.config.mjs` and `tsconfig.json` read the renderer source from `../Volt-Renderer` (older folder names `volt-renderer`, `Octane-Renderer` and `renderer` are also accepted).

```sh
git clone https://github.com/plus-emulator/Volt.git
git clone https://github.com/plus-emulator/Volt-Renderer.git
corepack enable
(cd Volt-Renderer && yarn install)
(cd Volt && yarn install)
```

Re-run `yarn install` in Volt-Renderer whenever it bumps `pixi.js`; the Vite config stops with an error if the installed version does not match.

### 2. Create the configuration files

Runtime configuration lives in `public/configuration/`. Copy the examples (the copies are gitignored):

```sh
cd Volt/public/configuration
cp renderer-config.json.example.json renderer-config.json
cp ui-config.example ui-config.json
cp client-mode.example client-mode.json
```

| File | Key settings |
|------|--------------|
| `renderer-config.json` | `socket.url` (game server WebSocket), `api.url`, `asset.url`, `image.library.url`, `hof.furni.url`, `gamedata.url` and the per-file gamedata URLs |
| `ui-config.json` | `camera.url`, `thumbnails.url`, `url.prefix`, `habbopages.url`, catalogue and UI options |
| `client-mode.json` | `secureAssetsEnabled`, `secureApiEnabled`, `distObfuscationEnabled`, `apiBaseUrl`, `plainConfigBaseUrl`, `plainGamedataBaseUrl` |

Translations (`UITexts_*.jsonc.example`, `QuestUITexts.jsonc.example`) and `hotlooks.example` sit in the same folder.

### 3. Connect to an emulator

- `socket.url` - the emulator's WebSocket server. For PlusEMU this is the `Nitro` section of `Config/config.json` (default port 2096), e.g. `ws://127.0.0.1:2096` locally or `wss://` behind a TLS proxy.
- `api.url` - the HTTP API used for login, maintenance and auth. The dev server proxies `/api/*` to `AUTH_PROXY_TARGET`, else `api.url`, else `http://127.0.0.1:2096`.
- The client reads an SSO ticket from the `?sso=` query parameter.

In development, assets can be served from a sibling `../Nitro-Files/` directory: `nitro-assets/` is mounted at `/nitro-assets` and `swf/` at `/swf`.

### 4. Run

```sh
yarn start        # Vite dev server with hot reload (listens on all interfaces)
```

## Building for production

| Command | What it does |
|---------|--------------|
| `yarn vite build` | Plain Vite build into `dist/`. This is what the release workflow publishes. |
| `yarn build` | `prebuild` (JSON mode prompt if unset, writes `public/configuration/bootstrap.js` and `asset-loader.js`), then `vite build`, then `scripts/minify-dist.mjs`, which minifies JSON and writes gzip-encoded `.dat` copies of the JS and CSS for the obfuscated loader. |
| `yarn build:prod` | Updates the browserslist database, then runs `yarn build`. |
| `yarn preview` | Serves `dist/` locally. |

Upload the contents of `dist/` to your web server together with your configuration files. Set `VITE_BASE` to change the base path (default `./`).

## JSON or JSONC configuration

Configuration and gamedata files can be parsed as strict JSON (`legacy`), JSONC with comments and trailing commas (`jsonc`), or `auto` (strict first, then JSONC). The mode is baked in at build time:

```sh
yarn configure                    # interactive, writes .volt-build.json
VOLT_JSON_MODE=jsonc yarn build   # one-off override
```

Without a setting, plain `vite` builds use `auto`.

## Split gamedata

Gamedata (FurnitureData, FigureData, FigureMap, EffectMap, ProductData, HabboAvatarActions, ExternalTexts, UITexts) can be a single file or a directory of small files in `core/`, `custom/` and `seasonal/` tiers, each listed in a `manifest.jsonc`. Later tiers override earlier ones. Point the URL at the directory with a trailing slash:

```jsonc
"furnidata.url": "https://example.com/gamedata/furnidata/"
```

Generate the `core/` tier from a legacy file:

```sh
node scripts/split-gamedata.mjs --input FurnitureData.json --output gamedata/furnidata
node scripts/split-gamedata.mjs --help
```

## Development scripts

| Command | Purpose |
|---------|---------|
| `yarn typecheck` | Type check with `tsgo` (TypeScript native preview) |
| `yarn lint` / `yarn lint:fix` | Biome lint on `src/` |
| `yarn check:biome` / `yarn format` | Biome check / format |
| `yarn lint:hooks` | ESLint rules-of-hooks gate (run in CI) |
| `yarn test` / `yarn test:watch` | Vitest |
| `yarn verify:jsonc` | Validate JSONC files |

`yarn typecheck` also expects the renderer linked at `node_modules/@volt/renderer`:

```sh
mkdir -p node_modules/@volt && ln -sfn "$(realpath ../Volt-Renderer)" node_modules/@volt/renderer
```

CI runs the type check, the hooks lint and the tests on pushes and pull requests.

## Releases

Every push to `main` builds the client with `yarn vite build` against Volt-Renderer `main` and publishes a GitHub release tagged `client-v<package version>-<short sha>` with `volt-client.zip` (the contents of `dist/`). Hotel installers download the latest release.

`install.sh` / `install.bat` (both run `install.mjs`) automate the setup steps above: they check Node against `.nvmrc` and `package.json`, clone Volt-Renderer to `../Volt-Renderer` if missing, run `yarn install` in both repositories, link `node_modules/@volt/renderer`, copy the three configuration files, ask for the JSON mode and URLs, and run `yarn build`. `node install.mjs --help` lists the flags; `--non-interactive` with `--socket-url=...` and friends runs it unattended.

## Licence

GPL-3.0. See [LICENSE](LICENSE).
