# Contributing to Volt

## Set up

You need Node.js 22.12 or newer, Yarn 4 (`corepack enable`) and Git. Put [Volt-Renderer](https://github.com/plus-emulator/Volt-Renderer) next to this folder, then:

```sh
(cd ../Volt-Renderer && yarn install)
yarn install
yarn start
```

`install.sh` or `install.bat` does these steps for you. See [Set up the Volt client](https://docs.plusemu.dev/getting-started/volt-client/#build-from-source).

## Scripts

| Command | Purpose |
|---------|---------|
| `yarn typecheck` | Type check with `tsgo` |
| `yarn lint` / `yarn lint:fix` | Biome lint on `src/` |
| `yarn check:biome` / `yarn format` | Biome check / format |
| `yarn lint:hooks` | ESLint rules-of-hooks check (runs in CI) |
| `yarn test` / `yarn test:watch` | Vitest |
| `yarn verify:jsonc` | Check JSONC files |
| `yarn check:protocol` | Check packet ids |

`yarn typecheck` needs the renderer linked at `node_modules/@volt/renderer`:

```sh
mkdir -p node_modules/@volt && ln -sfn "$(realpath ../Volt-Renderer)" node_modules/@volt/renderer
```

CI runs the type check, the hooks lint and the tests on every push and pull request.

## Pull requests

- Use Conventional Commit titles (`type(scope): summary`) and keep the description short.
- UI must match the Habbo AIR client. Work from the AIR export and compare screenshots with the AIR reference.
- Do not add new tests. Verify a change by building it and checking it in the running client.

## Releases

A release is started by hand. Run **Actions > Build & Publish Client Release** on `main`. The optional `commit` input selects the exact commit to build.

- The release is tagged `client-v<package version>-<short sha>` and has `volt-client.zip` (the contents of `dist/`). Hotel installers download the latest release.
- Release runs queue instead of replacing waiting runs (up to GitHub's limit of 100).
- Assets upload to a draft first. If a run fails, run it again and it continues the same draft. An already published tag stays unchanged.
