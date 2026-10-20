# Phasor

An iPhone-first scientific calculator with complex arithmetic, rectangular/polar coordinates, TI-Nspire-inspired nested menus, and offline Home Screen installation. Hosted entirely as static files on GitHub Pages. No local server, certificate setup, account, WebRTC connection or signaling service is needed to use the app.

## Use on iPhone

1. Open the published GitHub Pages address in Safari, or scan the QR from **Settings → Install on iPhone** on another device.
2. Select **Share → Add to Home Screen**.
3. Open the new Phasor icon **once while connected to the internet** and wait for **Offline ready**. Installed web apps may have separate storage from Safari.
4. You can now close your laptop, disconnect the network and calculate offline.

All computations, variables, settings and worksheet history stay on your device. No analytics or third-party scripts are loaded. Browser storage is best-effort; clearing website data or storage eviction removes the offline installation. The app requests persistent storage where available.

## Publish with GitHub Pages

Use a public GitHub repository. In **Settings → Pages → Build and deployment**, set **Source: GitHub Actions**. Pushing to `main` runs the included workflow, tests the calculator, builds the static files, verifies offline operation in Chromium, and deploys `dist/` to GitHub Pages. Pull requests run the same checks without deploying.

No custom domain or secrets are required. GitHub supplies HTTPS for the `github.io` address. All asset references, manifest paths and service worker caches are relative to the repository directory, so a project site such as `https://OWNER.github.io/REPOSITORY/` works without build configuration.

The repository includes source and a lockfile. The workflow builds all dependencies into the published JavaScript; no runtime CDN is required. The generated `dist/` directory is ignored locally and published as a Pages artifact.

## Calculator

- Real/complex arithmetic, powers, roots, natural/common logarithms, exponentials, trig/inverse trig, hyperbolic functions, factorials, permutations and combinations.
- Both `i` and `j` represent the imaginary unit: `3+4j`, `sqrt(-1)`, `exp(j*pi)`, `(3+4j)/(2-j)`.
- Polar input: `5∠90` for numeric literals or `polar(5,90)` / `rect(5,90)` for expressions. `DEG`/`RAD` applies to trig, inverse trig, `arg`, `phase`, polar input and polar output. Hyperbolic arguments remain dimensionless.
- Tap **a + bj** / **r ∠ θ** to change worksheet output. Results retain their full numeric precision; Settings provides ten or fourteen significant digits for display.
- Complex helpers: `abs(z)`, `arg(z)`, `re(z)`, `im(z)`, `conj(z)`.
- Engineering helpers: `parallel(z1,z2,…)`, `rms(peak)`, `db(amplitudeRatio)`, `db10(powerRatio)`, `fromdb(dB)`.
- Store variables with `z=3+4j`; `ans` recalls the previous answer. Tap past expressions to edit them or past results to insert their numeric values.
- The last 100 calculations are retained. Variables and the previous answer are saved independently as numeric values, so changing angle mode does not reinterpret them. Clearing history clears variables too.
- **menu** opens nested function categories; **catalog** jumps to complex functions. **2nd** exposes alternate keys. Tap the keyboard button for the system keyboard and variable names. Physical keyboards support Enter and ↑ (last expression).
- Settings includes JSON history export and an iPhone installation QR.

This version evaluates scalar numeric expressions; symbolic CAS, matrices, graphing and a units interface are outside its scope. The math engine is separate from the UI so graphing can be added later.

## Development

Node.js 22+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run build
pnpm exec playwright install chromium
pnpm run test:browser
```

For optional foreground local preview:

```sh
pnpm start
# http://localhost:8080/
```

The local preview is a development tool, not an application requirement. GitHub Pages serves the production app without any process on your computer.

The browser test starts and stops its own temporary static preview at `/phasor-calculator/`, exercises scientific input and nested menus, checks the installation QR, disables network access and reopens the app, and checks cache updates without deleting another app's cache. Set `BASE_URL` to test an already published site (update simulation is skipped remotely). Physical iPhone Home Screen installation still needs device verification.

## Files

- `src/engine.js`: mathjs scalar evaluator, complex formatting, angle modes and persistent state.
- `src/app.js`: mobile worksheet, keypad, nested menus and installation QR.
- `src/connect.js`: immediate app startup and background offline registration.
- `public/sw.js`: complete versioned offline cache, scoped to this Pages project.
- `public/manifest.webmanifest`: Home Screen app metadata.
- `scripts/build.mjs`: bundles dependencies and hashes the static app for cache updates.
- `.github/workflows/pages.yml`: tests, static build and GitHub Pages deployment.

Updates download when the app is opened online. A new cache activates only after all application files are saved; old caches for this project are then cleaned up. Other projects on the same `github.io` origin keep their caches. User history and variables remain in localStorage.

This replaces the initial laptop-hosted WebRTC prototype. Any local test certificates created for that prototype are unnecessary and are excluded from the repository; you may remove their trust profiles from your devices.
