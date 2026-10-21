import {createHash} from 'node:crypto';
import {relative,join} from 'node:path';
import {build} from 'esbuild';
import {cp, mkdir, rm, readdir, readFile, writeFile} from 'node:fs/promises';
const {version:appVersion}=JSON.parse(await readFile('package.json','utf8'));
await rm('dist', {recursive:true, force:true});
await mkdir('dist');
await cp('public', 'dist', {recursive:true});
await cp('node_modules/mathlive/fonts','dist/fonts',{recursive:true});
await cp('node_modules/mathlive/mathlive-static.css','dist/mathlive-static.css');
await cp('node_modules/mathlive/LICENSE.txt','dist/mathlive-LICENSE.txt');
await build({entryPoints:['src/app.js'], bundle:true, format:'esm', outfile:'dist/app.js', minify:true, define:{__APP_VERSION__:JSON.stringify(appVersion)}, target:['safari17']});
console.log(`Built Phasor: ${(await readdir('dist',{recursive:true,withFileTypes:true})).filter(f=>f.isFile()).length} static files. Share dist/ through AppLauncher.`);

const files=[];
async function collect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await collect(path);else if(!entry.name.startsWith('.')&&entry.name!=='release.json'){const data=await readFile(path);files.push({path:relative('dist',path).split('\\').join('/'),size:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}}
await collect('dist');files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
const version=createHash('sha256').update(JSON.stringify(files)).digest('hex');
await writeFile('dist/release.json',JSON.stringify({format:1,id:'phasor-calculator',name:'Phasor',entry:'index.html',icon:'icon.png',appVersion,version,files}));
