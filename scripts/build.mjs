import { build } from 'esbuild';
import { cp, mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
await cp('public', 'dist', { recursive: true });
await build({entryPoints:['src/app.js','src/connect.js','src/library.js','src/pairing.js','src/scanner.js'],bundle:true,external:['./app.js','./library.js','./pairing.js','./scanner.js'],format:'esm',outdir:'dist',minify:true,target:['safari17']});
await build({entryPoints:['src/sw.js'],bundle:true,format:'esm',outdir:'dist',minify:false,target:['safari17']});
const hash = createHash('sha256');
for (const file of (await readdir('dist')).sort()) {
  hash.update(file).update(await readFile('dist/' + file));
}
const version = hash.digest('hex');
const assets=['./',...(await readdir('dist')).filter(file=>file!=='sw.js'&&!file.startsWith('.')).map(file=>'./'+file)];
const sw = await readFile('dist/sw.js', 'utf8');
await writeFile('dist/sw.js', sw.replaceAll('__VERSION__', version).replace('__ASSETS__',JSON.stringify(assets)));
await writeFile('dist/.nojekyll', '');
console.log('Built Pocket Library · ' + version.slice(0, 12));
