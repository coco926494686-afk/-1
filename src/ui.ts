import { ColorInfo, emptyLibrary, Library, replacement, Theme, uid, validHex, validateLibrary } from './model';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let lib:Library=emptyLibrary(),active='',colors:ColorInfo[]=[],checked=new Set<string>(),scanned=false,fixturePassed=false,busy=true,canUndo=false,dirty=false,thumbURL='';
let pendingConfirm:(()=>void)|null=null;
const post=(type:string,extra:Record<string,unknown>={})=>parent.postMessage({pluginMessage:{type,...extra}},'*');
function status(message:string,kind=''){ $('status').textContent=message;$('status').className='status '+kind; }
function changed(){dirty=true;$('storage-state').textContent='有未保存的主题更改 · 应用 / 扫描时也会保存';refreshPreview();}
function theme():Theme|undefined{return lib.themes.find(t=>t.id===active);}
function buttonState(){
 document.querySelectorAll<HTMLButtonElement>('button:not(#sample-button)').forEach(b=>{b.disabled=busy;});
 document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select').forEach(e=>e.disabled=busy);
 $('apply').toggleAttribute('disabled',busy||!scanned||!theme());
 $('batch').toggleAttribute('disabled',busy||!scanned||!fixturePassed||checked.size===0||checked.size>40);
 $('undo').toggleAttribute('disabled',busy||!canUndo||!scanned);
 $('delete-theme').toggleAttribute('disabled',busy||!theme());
 $('export').toggleAttribute('disabled',busy||!lib.themes.length);
 $('theme-name').toggleAttribute('disabled',busy||!theme());
 $('batch-count').textContent=`已勾选 ${checked.size} 套主题`;
}
function swatch(color:string,className='swatch'){const d=document.createElement('span');d.className=className;d.style.backgroundColor=color;return d;}
function renderThemes(){
 const root=$('themes');root.replaceChildren();$('theme-count').textContent=String(lib.themes.length);
 if(!lib.themes.length){const p=document.createElement('p');p.className='empty';p.textContent='扫描 Frame 后\n自动创建 24 套主题';root.append(p);}
 for(const t of lib.themes){
  const row=document.createElement('div');row.className='theme-row'+(t.id===active?' active':'');
  const check=document.createElement('input');check.type='checkbox';check.checked=checked.has(t.id);check.setAttribute('aria-label','批量生成 '+t.name);
  check.onchange=()=>{check.checked?checked.add(t.id):checked.delete(t.id);buttonState();};
  const btn=document.createElement('button');btn.className='theme-choice';const label=document.createElement('span');label.className='theme-label';label.textContent=t.name;
  const dots=document.createElement('span');dots.className='dots';Object.values(t.colors).slice(0,5).forEach(c=>dots.append(swatch(c,'dot')));
  btn.append(label,dots);btn.onclick=()=>{active=t.id;render();};row.append(check,btn);root.append(row);
 }
}
function renderTokens(){
 const t=theme();$('theme-name').setAttribute('value',t?.name||'');($<HTMLInputElement>('theme-name')).value=t?.name||'';
 const root=$('tokens');root.replaceChildren();
 if(!lib.tokens.length){const p=document.createElement('p');p.className='empty';p.textContent='扫描后在这里编辑语义颜色';root.append(p);}
 for(const token of lib.tokens){
  if(!t)break;
  const row=document.createElement('div');row.className='token-row';
  const name=document.createElement('input');name.value=token.name;name.maxLength=100;name.className='token-name';name.setAttribute('aria-label','Token 名称');name.onchange=()=>{if(!name.value.trim()){name.value=token.name;return;}token.name=name.value.trim();changed();renderMappings();};
  const picker=document.createElement('input');picker.type='color';picker.value=t.colors[token.id];picker.setAttribute('aria-label',token.name+' 颜色');
  const hex=document.createElement('input');hex.value=t.colors[token.id];hex.className='hex';hex.maxLength=7;hex.setAttribute('aria-label',token.name+' 十六进制颜色');
  picker.oninput=()=>{t.colors[token.id]=picker.value.toUpperCase();hex.value=t.colors[token.id];changed();};picker.onchange=()=>renderThemes();
  hex.onchange=()=>{if(!validHex(hex.value)){status('颜色格式应为 #RRGGBB','error');hex.value=t.colors[token.id];return;}t.colors[token.id]=hex.value.toUpperCase();picker.value=hex.value;changed();renderThemes();};
  row.append(name,picker,hex);root.append(row);
 }
}
function renderMappings(){
 const root=$('mappings');root.replaceChildren();
 for(const m of lib.mappings){
  const row=document.createElement('div');row.className='mapping-row';const code=document.createElement('code');code.textContent=m.source;
  const select=document.createElement('select');select.setAttribute('aria-label',m.source+' 对应 Token');
  for(const t of lib.tokens){const option=document.createElement('option');option.value=t.id;option.textContent=t.name;select.append(option);}select.value=m.tokenId;
  select.onchange=()=>{m.tokenId=select.value;changed();};
  const hint=document.createElement('div');hint.className='map-info';const c=colors.find(c=>c.source===m.source);hint.textContent=c?`${c.count} 处 · ${c.roles.join(' / ')}`:'历史源颜色 · 当前 Frame 未使用';row.append(swatch(m.source),code,select,hint);root.append(row);
 }
 const remove=$<HTMLSelectElement>('remove-token-select');remove.replaceChildren();
 for(const t of lib.tokens){const option=document.createElement('option');option.value=t.id;option.textContent=t.name;remove.append(option);}
}
function refreshPreview(){
 const t=theme(),root=$('preview-colors');root.replaceChildren();let changes=0;
 if(t){
  for(const c of colors){const dest=replacement(lib,t,c.source)||c.source;if(dest!==c.source)changes+=c.count;
   const row=document.createElement('div');row.className='color-preview';const from=document.createElement('span');from.textContent=c.source+' →';const to=document.createElement('span');to.textContent=dest;
   const count=document.createElement('span');count.className='count';count.textContent=`${c.count} 处`;
   row.append(swatch(c.source),from,swatch(dest),to,count);root.append(row);
  }
  const values=Object.values(t.colors);const find=(s:string,fallback:string)=>t.colors[lib.tokens.find(k=>k.name.includes(s))?.id||'']||fallback;
  const surface=find('表面',values[0]||'#FFFFFF'),text=find('文字','#172033'),accent=find('品牌','#2563EB'),background=find('背景','#F8FAFC');
  $('sample').style.background=background;$('sample-card').style.background=surface;$('sample-card').style.color=text;$('sample-card').style.borderColor=accent;
  $('sample-button').style.background=accent;$('sample-button').style.color=surface;
 }
 $('preview-summary').textContent=scanned?`相对扫描原图：${changes} 处颜色预计变化；透明度保留。最终写入数以执行报告为准。`:'扫描后显示源颜色到主题颜色的完整对照。';
 buttonState();
}
function render(){renderThemes();renderTokens();renderMappings();refreshPreview();}
function confirmAction(title:string,message:string,action:()=>void){$('confirm-title').textContent=title;$('confirm-message').textContent=message;pendingConfirm=action;$<HTMLDialogElement>('confirm-dialog').showModal();}
$('confirm-cancel').onclick=()=>{$<HTMLDialogElement>('confirm-dialog').close();pendingConfirm=null;};
$('confirm-ok').onclick=()=>{const action=pendingConfirm;pendingConfirm=null;$<HTMLDialogElement>('confirm-dialog').close();action?.();};
$('scan').onclick=()=>post('scan',{library:lib});
$('test').onclick=()=>confirmAction('创建并验证测试 Frame','会在当前页面新建一个小型测试 Frame，执行换肤和还原，验证准确后保留供你检查。已有 Frame 不会修改。',()=>post('test'));
$('apply').onclick=()=>post('apply',{library:lib,themeId:active});
$('batch').onclick=()=>post('batch',{library:lib,themeIds:[...checked]});
$('undo').onclick=()=>post('undo');$('save').onclick=()=>post('save',{library:lib});
$('select-all').onclick=()=>{checked=new Set(lib.themes.map(t=>t.id));renderThemes();buttonState();};
$('select-none').onclick=()=>{checked.clear();renderThemes();buttonState();};
$<HTMLInputElement>('theme-name').onchange=()=>{const t=theme(),input=$<HTMLInputElement>('theme-name');if(t&&input.value.trim()){t.name=input.value.trim();changed();renderThemes();}else if(t)input.value=t.name;};
$('new-theme').onclick=()=>{
 if(lib.themes.length>=200){status('最多保存 200 套主题','error');return;}
 const t=theme();const next={id:uid(),name:t?t.name+' 副本':'新主题',colors:t?{...t.colors}:Object.fromEntries(lib.tokens.map(t=>[t.id,lib.mappings.find(m=>m.tokenId===t.id)?.source||'#2563EB']))};
 lib.themes.push(next);active=next.id;checked.add(next.id);changed();render();
};
$('delete-theme').onclick=()=>{const t=theme();if(!t)return;confirmAction('删除主题',`删除「${t.name}」？不会改变任何画布颜色。删除后请保存主题库。`,()=>{lib.themes=lib.themes.filter(x=>x.id!==t.id);checked.delete(t.id);active=lib.themes[0]?.id||'';changed();render();});};
$('add-token').onclick=()=>{if(lib.tokens.length>=1000){status('Token 已达上限','error');return;}const id='token-'+uid();lib.tokens.push({id,name:'自定义语义 '+(lib.tokens.length+1)});for(const t of lib.themes)t.colors[id]='#2563EB';changed();render();};
$('remove-token').onclick=()=>{const id=$<HTMLSelectElement>('remove-token-select').value;if(lib.mappings.some(m=>m.tokenId===id)){status('此 Token 仍被源颜色使用，请先在映射列表中改指向其他 Token。','error');return;}lib.tokens=lib.tokens.filter(t=>t.id!==id);for(const t of lib.themes)delete t.colors[id];changed();render();};
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));for(const tab of ['colors','mapping','help'])$('panel-'+tab).hidden=button.dataset.tab!==tab;});
$('export').onclick=()=>{try{const json=JSON.stringify(validateLibrary(lib),null,2),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='frame-skin-themes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('JSON 已导出；文件包含主题、Token 和颜色映射。','success');}catch(e){status(String(e),'error');}};
$('import').onclick=()=>$<HTMLInputElement>('file').click();
$<HTMLInputElement>('file').onchange=async()=>{
 const input=$<HTMLInputElement>('file'),file=input.files?.[0];input.value='';if(!file)return;
 if(file.size>2*1024*1024){status('JSON 文件不能超过 2 MB','error');return;}
 try{const next=validateLibrary(JSON.parse(await file.text()));confirmAction('导入主题库',`用文件中的 ${next.themes.length} 套主题和 ${next.tokens.length} 个 Token 替换当前主题库？建议先导出备份。画布不会改变。`,()=>{lib=next;active=lib.themes[0]?.id||'';checked=new Set(active?[active]:[]);changed();render();status('已载入 JSON，请检查映射后保存主题库。');});}catch(e){status('导入失败：'+String(e),'error');}
};
window.onmessage=event=>{
 if(event.source!==parent)return;
 const m=event.data.pluginMessage;if(!m||typeof m.type!=='string')return;
 if(m.type==='init'||m.type==='scan'||m.type==='saved'){
  if(m.type==='init')busy=false;
  if(m.library){lib=validateLibrary(m.library);if(!lib.themes.some(t=>t.id===active))active=lib.themes[0]?.id||'';checked=new Set([...checked].filter(id=>lib.themes.some(t=>t.id===id)));if(!checked.size&&active)checked.add(active);dirty=false;$('storage-state').textContent='主题保存在插件本地，可用 JSON 备份。';}
  if(m.type==='scan'){
   scanned=true;canUndo=false;colors=m.colors;fixturePassed=!!m.fixturePassed;$('frame-name').textContent=m.name;$('frame-stats').textContent=`${m.nodes} 个扫描图层 · ${colors.length} 种可编辑源颜色 · ${m.slots} 个颜色属性（含文字区间）`;
   const issues=$('issues');issues.replaceChildren();for(const item of m.issues){const p=document.createElement('div');p.className='issue-item';p.textContent=item.node+'：'+item.reason;issues.append(p);}
   $('issues-box').hidden=!m.issues.length;$('issues-summary').textContent=`兼容性报告 · ${m.issues.length} 项保留 / 跳过`;
   if(thumbURL)URL.revokeObjectURL(thumbURL);thumbURL='';const img=$<HTMLImageElement>('thumbnail');img.hidden=true;
   if(m.thumbnail){thumbURL=URL.createObjectURL(new Blob([new Uint8Array(m.thumbnail)],{type:'image/png'}));img.src=thumbURL;img.hidden=false;}
   status('扫描完成。选择主题并检查右侧颜色预览，画布尚未修改。','success');
  }
  render();
 }else if(m.type==='busy'){busy=m.busy;buttonState();}
 else if(m.type==='stale'){scanned=false;canUndo=false;status(m.message);buttonState();}
 else if(m.type==='error')status(m.message,'error');
 else if(m.type==='notice')status(m.message);
 else if(m.type==='done'){if(m.canUndo!==undefined)canUndo=m.canUndo;if(m.fixturePassed)fixturePassed=true;status(m.message,'success');buttonState();}
 $('test-state').textContent=fixturePassed?'✓ 本次插件会话的测试 Frame 验证已通过':'先运行测试 Frame 验证，验证通过后开放批量。';
 if(m.type==='saved')status('主题库已保存。','success');
};
window.addEventListener('beforeunload',()=>{if(thumbURL)URL.revokeObjectURL(thumbURL);});
render();
