import {build} from 'esbuild';
import {cp, mkdir, rm, readdir} from 'node:fs/promises';
await rm('dist', {recursive:true, force:true});
await mkdir('dist');
await cp('public', 'dist', {recursive:true});
await build({entryPoints:['src/app.js'], bundle:true, format:'esm', outfile:'dist/app.js', minify:true, target:['safari17']});
console.log(`Built Phasor: ${(await readdir('dist')).length} static files. Share dist/ through AppLauncher.`);
