# Upstream provenance

- Source: https://github.com/dmmulroy/anti-slop
- Source commit recorded at install time: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (repository HEAD when the skill assets were fetched)
- Install path: `npx skills use dmmulroy/anti-slop --skill install-anti-slop`, then `node scripts/install.mjs` from the skill's supporting files
- Vendored plugin paths:
  - `tools/oxlint/anti-slop/index.ts` (generic plugin, registered in `.oxlintrc.json`)
  - `tools/oxlint/anti-slop/effect/` (opt-in Effect plugin, not registered)
- Oxlint dependency: `oxlint@1.83.0` and `@oxlint/plugins@1.83.0`, pinned exactly as devDependencies

## Intentional deviations

- The Effect plugin is not registered because this repository has no direct `effect` dependency.
- `tools/oxlint/anti-slop` is excluded from the application `tsconfig.json` typecheck: the plugin uses `.ts` import specifiers, and Oxlint compiles the plugin itself. Application code never imports it.
- No changes were made to the vendored plugin sources.
