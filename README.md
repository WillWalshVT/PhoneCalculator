# Phasor · Phone Calculator

A scientific calculator for iPhone and desktop, with complex arithmetic, rectangular/polar results and a TI-Nspire-inspired function menu stack. This repository contains only the calculator. Installation, QR transfer and offline asset serving belong to [AppLauncher](https://github.com/WillWalshVT/AppLauncher).

## Build and install

Node.js 22+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run build
pnpm exec playwright install chromium
pnpm run test:browser
```

The complete ready-to-share app is **dist/**: `index.html`, `app.js`, `style.css`, `icon.png`, and `launcher.json`. All runtime dependencies are bundled locally. No backend, external scripts, app-owned service worker or PWA manifest is included.

1. Open [AppLauncher](https://willwalshvt.github.io/AppLauncher/) on the laptop. Choose **Share an app → Choose folder** and select **dist/**, not this source repository.
2. Confirm the name **Phasor**, included icon, entry **index.html**, App ID **phasor-calculator**, and isolation off. Choose **Generate QR**.
3. Scan with the iPhone camera. Confirm **Share → Add to Home Screen**, then open the new Phasor icon. Keep the laptop sender open until transfer finishes and the calculator appears.
4. Later launches open the calculator directly, including offline. A new transfer with the same ID updates code in the receiving container while retaining its calculator data. Separately installed PWA containers are independent.

The sharing QR is a live session, not a permanent release link. Installation details and the developer contract are maintained in [AppLauncher's guide](https://github.com/WillWalshVT/AppLauncher/blob/main/APP_GUIDE.md).

Optional end-to-end compatibility check (uses public signaling and separate browser storage):

```sh
APP_LAUNCHER_URL=https://willwalshvt.github.io/AppLauncher/ node tests/launcher.mjs
```

Optional validation from a separate AppLauncher checkout:

```sh
node /path/to/AppLauncher/scripts/validate-app.mjs /path/to/PhoneCalculator/dist --id phasor-calculator --json
```

## Calculator functions

- Real and complex scalar expressions, implicit multiplication, powers, roots, logarithms, trig/inverse trig and hyperbolic functions.
- `i` and `j` for the imaginary unit; enter `3+4j`, `5∠90`, or `polar(5,90)`. Toggle **a + bj / r ∠ θ** to change result display.
- **DEG/RAD** controls trig input/output, `polar()` and `arg()`. `log()` is the natural logarithm; `log10()` is base ten.
- Complex tools: `abs`, `arg`, `phase`, `conj`, `re`, `im`, `polar`, `rect`.
- Engineering: `parallel(100,-200j)`, `rms(10)`, `db(10)`, `db10(10)`, `fromdb(20)`.
- Factorials, permutations, combinations, GCD/LCM and rounding.
- Variables (`z=3+4j`), previous answer (`ans`), 100-entry history, 10/14-digit display precision, keyboard input and nested function menus. Graphing is not included.

History, settings and exact variable values are stored locally. Within AppLauncher, ordinary browser storage is namespaced by App ID. An existing calculator installed outside AppLauncher has separate storage; its history is not migrated automatically. **Settings → Export calculation history** downloads readable JSON for reference; import is not implemented. Clearing browser/PWA data can remove saved work. Use the export before removing an old installation.

## Development

- `src/engine.js`: calculation semantics and formatting, backed by mathjs.
- `src/app.js`: calculator UI and local history/settings/variables.
- `public/`: calculator HTML, styles, icon and AppLauncher metadata.
- `tests/`: numerical unit tests and mobile browser regression checks.
- `pnpm dev`: optional foreground localhost preview; never required for AppLauncher transfer.
- `pnpm run publish:prepare`: builds and refreshes root assets for the [online calculator preview](https://willwalshvt.github.io/PhoneCalculator/). Commit source and generated assets together. Pages deploys from main/root.

The online preview is an ordinary static calculator. Use AppLauncher for installed/offline delivery. Changes to sharing or installation behavior should be made in that separate repository.
