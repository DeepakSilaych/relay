# Contributing to Magi

Magi focuses on persistent agent terminals, multi-repository workspaces, and files/Git workflows. Open an issue before proposing a broad new product area.

## Start here

Read [AGENTS.md](AGENTS.md), [the style guide](docs/STYLEGUIDE.md), and [the architecture guide](docs/magi/lite-v1.md). Preserve Orca and third-party attribution. Reuse existing UI primitives and design tokens.

Use the pnpm version in `package.json`, run `pnpm install`, and start with `pnpm dev`. Only Magi entry points are part of the active app. Inherited upstream source remains available for reuse.

## Verify changes

```sh
pnpm exec tsc --noEmit -p config/tsconfig.magi.json
pnpm exec tsc --noEmit -p config/tsconfig.node.json
python3 -m unittest discover -s resources/magi/tests -v
node --test resources/magi/tests/updates.test.cjs
pnpm build
```

Run the relevant scripts in `resources/magi/tests` for UI changes. Always use `ORCA_BACKGROUND_LAUNCH=1`, a disposable `MAGI_ROOT`, and a disposable `MAGI_USER_DATA_PATH`. VM tests must use a dedicated temporary root. Never test against another person's active sessions or bring test windows to the foreground.

Explain the user-visible change, validation, and any remaining limitations in the pull request. Avoid unrelated formatting changes and generated build artifacts.

## Release policy

A maintainer packages Apple Silicon artifacts with `pnpm release:magi:mac`, verifies the bundle signature and packaged behavior, publishes to this repository, and updates the version and DMG SHA-256 in `DeepakSilaych/homebrew-tap`. Keep the application identifier stable. Current builds are ad-hoc signed; automatic installation must remain disabled until signed and notarized updates have been tested.
