import {cp,readdir} from 'node:fs/promises';
for(const file of await readdir('dist'))await cp('dist/'+file,file,{recursive:true});
console.log('Calculator-only GitHub Pages assets refreshed.');
