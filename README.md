# Pocket Library

A browser-only way to send local HTML/JavaScript apps from your laptop to an offline library on your iPhone.

**Live:** https://willwalshvt.github.io/PhoneCalculator/

GitHub Pages hosts the connector. Your app files transfer directly between browser tabs over encrypted WebRTC; they are not uploaded to GitHub or a file-hosting service. The laptop only needs an open browser tab while sending. There is no local server, certificate installation, account or API key.

Phasor, the original scientific/complex calculator, remains included under **Your apps → Phasor** and at `calculator.html`.

## Install the library on iPhone

1. Open the live link in Safari.
2. **Share → Add to Home Screen**.
3. Open the new icon once while online and wait for **Offline ready**.
4. Use **Receive an app → Scan QR with camera** from inside that installed library. This saves received apps into the Home Screen app's own storage.

Safari and a Home Screen app can have separate storage. Scanning with the system Camera opens Safari; an app saved there may not appear inside the Home Screen library. Use the library's built-in scanner or paste the sender's invitation into **Receive an app** in the installed library. Camera scanning requires permission; pasting a link works without it.

## Send an app from your laptop

1. Open the live link in a laptop browser and choose **Send an app**.
2. **Choose HTML** for a self-contained `.html` file, or **Choose app folder** for an HTML entry page plus JavaScript, styles and assets. Choose the *built static output* if using a framework.
3. Set the app name, stable app ID and entry page. Choose **Create pairing QR**.
4. On the phone, open **Receive an app → Scan QR with camera** and scan the laptop's QR.
5. Review the app name and size, then tap **Save app** (or **Update app**).
6. Wait for the saved confirmation. The laptop tab can now close; the phone can open the app offline.

Both devices need internet during pairing because discovery uses free public Nostr signaling relays through bundled Trystero. App files travel over a peer-to-peer WebRTC data channel. Relays are public infrastructure and availability varies. Prefer the same Wi-Fi; there is no TURN relay configured, so restrictive networks and some NAT combinations may block direct connections. A failed connection does not replace an existing saved app. Invitations contain random room credentials, expire after ten minutes, and close after successful transfer or cancellation. Treat an invitation like a temporary private link.

You can also choose **Save on this device** to import without pairing. There is a downloadable starter counter in the sender view, and **HTML ↓** on the Phasor card exports a portable calculator copy you can transfer as an app.

## Build compatible HTML/JavaScript apps

See [APP_GUIDE.md](APP_GUIDE.md) for a complete starter and supported file conventions.

- A single self-contained HTML file is the simplest format.
- Folder imports support relative HTML/CSS/JavaScript assets, literal ES module imports, literal dynamic imports, local JSON/text fetches, images and fonts.
- Include all dependencies in the folder. Use relative paths such as `./main.js`; bare npm imports, root-relative build paths and external CDN/API dependencies are not supported in the isolated offline runner.
- Multiple HTML pages can link to other included HTML pages. Use relative links.
- `localStorage` is provided per app with a 256 KB limit. `sessionStorage` is temporary. Saved changes are written asynchronously; wait for **Saved locally** before closing.
- Apps run in an opaque sandbox and cannot read the library, other apps, cookies or native IndexedDB. External network access, service workers, workers, nested frames and backend servers are not supported inside imported apps.
- Up to 250 files / 20 MB of file content per app. Hidden files are omitted; ZIP import is not included.
- Target current Safari/iOS 17+ or a modern Chromium browser. The library does not mirror or read another browser tab; select the app's actual files.

The app name labels a card. The **app ID** controls updates: sending the same ID replaces its files atomically and preserves its saved data. A different ID adds another app. Remove deletes both the files and that app's data from this device.

Installed apps live in browser IndexedDB; the connector and included calculator live in a versioned service-worker cache. Updating the connector does not delete imported apps. Browser storage is best-effort: clearing site data, storage pressure or removing a Home Screen app can remove saved files. The library requests persistent storage when supported. Keep source files on your laptop as the source of truth.

## GitHub Pages

The repository is configured for **Settings → Pages → Deploy from a branch → main → / (root)**. Compiled public assets are committed at the repository root. No custom domain or secrets are needed.

After editing connector source:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run test:browser  # build first if needed
pnpm run publish:prepare
```

Commit source, lockfile and refreshed root assets together. Pushing `main` triggers GitHub's branch-based deployment. `.github/workflows/pages.yml` tests the build; it does not control Pages deployment. `.nojekyll` allows all published assets to be served directly.

## Development and tests

Node.js 22+, pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run build
pnpm exec playwright install chromium
pnpm run test:browser
```

Optional local foreground preview: `pnpm start` at `http://localhost:8080/`. This is for development only; using the published connector needs no process on your computer.

Tests cover complex calculator math, package validation and integrity, a real QR decoder, calculator offline reopening, and two isolated browser contexts transferring an app over real WebRTC. The library tests verify consent, multiple apps, app updates, per-app storage, blocked parent access, relative ES modules/JSON fetch and offline reopening after the sender closes. Signaling is deterministic in CI using a Nostr-compatible test relay inside Playwright; the production transport is unchanged.

Additional checks:

```sh
# Real public signaling relays; requires network access:
LIVE_SIGNALING=1 node tests/library-browser.mjs
# Safari's browser engine:
pnpm exec playwright install webkit
LIVE_SIGNALING=1 TEST_BROWSER=webkit node tests/library-browser.mjs
# Check the deployed site rather than a local preview:
BASE_URL=https://willwalshvt.github.io/PhoneCalculator/ node tests/library-browser.mjs
```

Physical iPhone camera permission and Home Screen installation still require device verification. The included documentation explains the separate Safari/Home Screen storage contexts.

## Source map

- `src/library.js`: library, local file selection, sender/receiver UI and app launch.
- `src/package.js`: file validation, packaging, size limits and transfer integrity.
- `src/pairing.js`: expiring QR invitations, public relay discovery, WebRTC transfer and acknowledgements.
- `src/scanner.js`: in-library camera QR scanning, with a bundled decoder.
- `src/runtime.js`: isolated HTML runner, local assets/modules/fetch and app-specific storage bridge.
- `src/store.js`: IndexedDB records; atomic app updates preserve saved data.
- `src/sw.js`: versioned offline connector cache; retains imported apps.
- `src/app.js`, `src/engine.js`: included Phasor calculator.
- `scripts/build.mjs`: bundle all runtime dependencies locally and version the offline cache.
- `scripts/prepare-pages.mjs`: copy built public assets to the root for branch publishing.

Earlier local HTTPS test certificates are not needed and remain excluded from the repository. If you installed those prototype trust profiles, you can remove them.
