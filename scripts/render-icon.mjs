import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage({viewport:{width:512,height:512},deviceScaleFactor:1});await page.setContent('<style>body{margin:0}</style>'+await readFile('public/icon.svg','utf8'));await page.locator('svg').screenshot({path:'public/icon.png'});}finally{await browser.close();}
