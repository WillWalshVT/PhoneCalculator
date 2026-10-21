import {copyFile, readdir} from 'node:fs/promises';
// Root copies support the optional GitHub Pages calculator preview.
for (const file of await readdir('dist')) await copyFile('dist/' + file, file);
console.log('Calculator-only GitHub Pages assets refreshed.');
