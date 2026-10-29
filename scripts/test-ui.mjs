import { chromium } from 'playwright-core';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage({viewport:{width:1040,height:760},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent('<iframe title="Figma Plugin" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>');
 await page.evaluate(html=>{window.requests=[];window.addEventListener('message',e=>{if(e.source===document.querySelector('iframe').contentWindow)window.requests.push(e.data.pluginMessage);});document.querySelector('iframe').srcdoc=html;},await readFile('dist/ui.html','utf8'));
 const ui=page.frameLocator('iframe');await ui.locator('#frame-name').waitFor();
 const library={version:1,tokens:[{id:'surface',name:'表面 / 卡片'},{id:'text',name:'文字 / 主要'},{id:'accent',name:'品牌 / 强调'}],mappings:[{source:'#FFFFFF',tokenId:'surface'},{source:'#111111',tokenId:'text'},{source:'#2563EB',tokenId:'accent'}],themes:Array.from({length:24},(_,i)=>({id:'theme-'+i,name:i?'主题 '+(i+1):'经典蓝',colors:{surface:i%2?'#1E293B':'#FFFFFF',text:i%2?'#F1F5F9':'#111111',accent:i%2?'#60A5FA':'#2563EB'}}))};
 async function send(m){await page.evaluate(m=>document.querySelector('iframe').contentWindow.postMessage({pluginMessage:m},'*'),m);}
 await send({type:'init',library});await ui.locator('.theme-row').nth(23).waitFor();assert.equal(await ui.locator('.theme-row').count(),24);
 assert(await ui.locator('#apply').isDisabled());
 await send({type:'scan',library,name:'Mobile / Standard',nodes:12,slots:8,colors:[{source:'#FFFFFF',count:2,roles:['填充']},{source:'#111111',count:3,roles:['文字']},{source:'#2563EB',count:3,roles:['填充','描边']}],issues:[{node:'Image',reason:'图片填充保持原样'}],fixturePassed:false});
 await ui.locator('#apply').waitFor({state:'visible'});assert(await ui.locator('#apply').isEnabled());assert(await ui.locator('#batch').isDisabled());
 await ui.locator('.theme-choice').nth(1).click();assert.equal(await ui.locator('#theme-name').inputValue(),'主题 2');assert((await ui.locator('#preview-colors').textContent()).includes('#60A5FA'));
 await ui.locator('.hex').first().fill('#123456');await ui.locator('.hex').first().blur();assert((await ui.locator('#preview-colors').textContent()).includes('#123456'));
 await ui.locator('.hex').first().fill('INVALID');await ui.locator('.hex').first().blur();assert((await ui.locator('#status').textContent()).includes('#RRGGBB'));assert.equal(await ui.locator('.hex').first().inputValue(),'#123456');
 await ui.locator('[data-tab="mapping"]').click();await ui.locator('.mapping-row select').first().selectOption('accent');assert((await ui.locator('#preview-colors').textContent()).includes('#60A5FA'));
 await ui.locator('#add-token').click();assert.equal(await ui.locator('#remove-token-select option').count(),4);await ui.locator('#remove-token-select').selectOption({index:3});await ui.locator('#remove-token').click();assert.equal(await ui.locator('#remove-token-select option').count(),3);
 await ui.locator('[data-tab="colors"]').click();await ui.locator('#new-theme').click();assert.equal(await ui.locator('.theme-row').count(),25);
 await ui.locator('#theme-name').fill('我的主题');await ui.locator('#theme-name').blur();await ui.locator('#save').click();
 const saved=await page.evaluate(()=>window.requests.findLast(m=>m.type==='save'));assert.equal(saved.library.themes.at(-1).name,'我的主题');
 await send({type:'saved',library:saved.library});await ui.locator('#delete-theme').click();await ui.locator('#confirm-cancel').click();assert.equal(await ui.locator('.theme-row').count(),25);
 const downloadPromise=page.waitForEvent('download');await ui.locator('#export').click();const download=await downloadPromise;const exportPath=await download.path();const exported=JSON.parse(await readFile(exportPath,'utf8'));assert.equal(exported.themes.length,25);
 await ui.locator('#file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":999}')});await ui.locator('#status.error').waitFor();assert((await ui.locator('#status').textContent()).includes('导入失败'));
 await ui.locator('#file').setInputFiles({name:'themes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(library))});await ui.locator('#confirm-dialog').waitFor({state:'visible'});await ui.locator('#confirm-ok').click();assert.equal(await ui.locator('.theme-row').count(),24);
 await send({type:'done',fixturePassed:true,canUndo:true,message:'测试通过'});await ui.locator('#select-all').click();assert(await ui.locator('#batch').isEnabled());await ui.locator('#batch').click();
 const batch=await page.evaluate(()=>window.requests.findLast(m=>m.type==='batch'));assert.equal(batch.themeIds.length,24);
 await send({type:'busy',busy:true});assert(await ui.locator('#apply').isDisabled());await send({type:'busy',busy:false});
 await send({type:'stale',message:'选择已变化，请重新扫描'});assert(await ui.locator('#apply').isDisabled());assert(await ui.locator('#undo').isDisabled());
 await send({type:'scan',library,name:'Mobile / Standard',nodes:12,slots:8,colors:[{source:'#FFFFFF',count:2,roles:['填充']},{source:'#111111',count:3,roles:['文字']},{source:'#2563EB',count:3,roles:['填充']}],issues:[],fixturePassed:true});await ui.locator('.theme-choice').nth(1).click();
 await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/plugin-ui.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('UI: 24 presets, theme edits, mapping, token CRUD, JSON export/import, validation, batch gating, stale/busy guards: PASS');
}finally{await browser.close();}
