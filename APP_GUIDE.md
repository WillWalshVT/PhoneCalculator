# Make an app for Pocket Library

Start with a single HTML file. Save this as `counter.html` on your laptop, then choose it in **Send an app → Choose HTML**:

```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Counter</title>
<style>
  body { font: 24px system-ui; padding: 20vh 20px; text-align: center;
         background: #152632; color: #cce9d4; }
  button { font: inherit; padding: 20px; border: 0; border-radius: 15px;
           background: #acd9bd; color: #153c2c; }
</style>
<h1>My Counter</h1>
<button id="count"></button>
<script>
  let n = Number(localStorage.getItem('count') || 0);
  const button = document.querySelector('#count');
  const draw = () => button.textContent = `Count: ${n}`;
  draw();
  button.onclick = () => {
    localStorage.setItem('count', ++n);
    draw();
  };
</script>
</html>
```

The sender also has a **Download starter HTML** button. No build tool is needed for this format.

## Multiple files

For a larger app, select the whole directory:

```text
my-app/
  index.html
  style.css
  main.js
  helper.js
  data.json
  images/
    logo.png
```

Use relative HTML references:

```html
<link rel="stylesheet" href="./style.css">
<img src="./images/logo.png" alt="Logo">
<script type="module" src="./main.js"></script>
```

Normal literal module imports and fetches of included files work:

```js
import { calculate } from './helper.js';
const data = await fetch('./data.json').then(response => response.json());
```

`fetch` resolves paths relative to the entry HTML page, just as in a normal web page. It supports GET requests for included files. Network APIs are blocked in the isolated runner. ES module dependencies must be literal relative paths; computed dynamic imports and bare imports such as `import React from 'react'` must be bundled first.

HTML attributes and CSS `url(...)` references to included images, fonts, styles and scripts are converted to offline resources at launch. JavaScript-generated asset URLs, custom worker URLs, complex asset loaders, `srcset`, and framework-specific history routing may need to be simplified or bundled into one self-contained file. Do not assume that every existing website can run unmodified.

For frameworks, export a static build and set its asset base to relative paths. A single-file export is the most compatible option. No Node, Python, server route or database server runs on the phone.

## Saved data

Use `localStorage.getItem`, `setItem`, `removeItem`, `clear`, `key` and `length`. The library provides these APIs inside the isolated app and saves each app's data separately. The limit is 256 KB per app. `sessionStorage` is temporary for the current launch.

Watch **Saved locally** in the top bar before closing the app, especially immediately after an edit. Native IndexedDB, cookies, service workers and unrestricted network access are unavailable in imported apps.

## Updates

Keep an app's ID stable, for example `my-counter`. Send a new version with that same ID to update files without losing saved data. Change the ID if you want a second, independent copy. All files are validated and saved together before replacing the previous version.

To move a received app between Safari and the installed Home Screen library, send it again into the intended library using **Receive → Scan QR with camera**, or paste the invitation there. Their browser storage may be separate.
