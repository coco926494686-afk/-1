import { emptyLibrary, extendLibrary, Library, Theme, validateLibrary } from './model';
import { execute, fingerprint, Patch, plan, prepareFonts, reversePatches, same, Scan, scanFrame, themedValue } from './engine';
declare const __html__:string;
figma.showUI(__html__,{width:1040,height:760,themeColors:true});
const STORE='frame-skin-library-v1';
let library:Library=emptyLibrary(),scan:Scan|null=null,pageId='',guard='',busy=false;
let undo:({kind:'apply';patches:Patch[]}|{kind:'batch';frames:FrameNode[];fingerprints:string[]})[]=[];
let fixturePassed=false;
const send=(type:string,data:Record<string,unknown>={})=>figma.ui.postMessage({type,...data});
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
function selectedFrame():FrameNode {
 const selection=figma.currentPage.selection;
 if(selection.length!==1||selection[0].type!=='FRAME')throw Error('请只选择一个 Frame（不接受组件或实例）');
 let p:BaseNode|null=selection[0];
 while(p&&p.type!=='PAGE'){if(('locked'in p&&p.locked)||['INSTANCE','COMPONENT','COMPONENT_SET'].includes(p.type))throw Error('所选 Frame 位于锁定图层或组件内部，不能安全修改');p=p.parent;}
 return selection[0];
}
function ensure():Scan {
 if(!scan||scan.frame.removed||figma.currentPage.id!==pageId||selectedFrame().id!==scan.frame.id)throw Error('选择已变化，请重新扫描当前 Frame');
 if(fingerprint(scan.frame)!==guard)throw Error('Frame 在扫描后发生编辑，请重新扫描以避免覆盖');
 return scan;
}
function selectedTheme(id:unknown):Theme {
 const theme=library.themes.find(t=>t.id===id);if(!theme)throw Error('主题不存在');return theme;
}
async function saveLibrary(value:unknown){const checked=validateLibrary(value);await figma.clientStorage.setAsync(STORE,checked);library=checked;}
async function doScan(){
 const frame=selectedFrame(),page=figma.currentPage.id;
 const result=scanFrame(frame,figma.mixed);
 const initial=fingerprint(frame);
 let thumbnail:Uint8Array|undefined;
 try{thumbnail=await frame.exportAsync({format:'PNG',constraint:{type:'WIDTH',value:640}});}catch{/* Color preview remains usable when export is unavailable. */}
 if(figma.currentPage.id!==page||selectedFrame().id!==frame.id||fingerprint(frame)!==initial)throw Error('扫描期间 Frame 发生变化，请重试');
 const next=extendLibrary(library,result.colors);await saveLibrary(next);
 if(figma.currentPage.id!==page||selectedFrame().id!==frame.id||fingerprint(frame)!==initial)throw Error('保存期间选择或 Frame 发生变化，请重试');
 scan=result;pageId=page;guard=initial;undo=[];
 send('scan',{name:frame.name,nodes:result.nodes,slots:result.slots.length,colors:result.colors,issues:result.issues,thumbnail,library,fixturePassed});
}
async function apply(id:unknown){
 const s=ensure(),theme=selectedTheme(id),patches=plan(s,library,theme);
 await prepareFonts(patches,f=>figma.loadFontAsync(f));ensure();
 if(!patches.length){send('notice',{message:'没有需要替换的颜色，当前颜色与主题一致。'});return;}
 figma.commitUndo();execute(patches);figma.commitUndo();
 guard=fingerprint(s.frame);undo.push({kind:'apply',patches});if(undo.length>20)undo.shift();
 send('done',{message:`已应用「${theme.name}」，修改 ${patches.length} 处颜色属性；布局与透明度保留。`,canUndo:true});
}
async function batch(ids:unknown){
 if(!fixturePassed)throw Error('请先运行「测试 Frame 验证」，通过后才可批量生成');
 const s=ensure();if(s.frame.parent?.type!=='PAGE')throw Error('批量复制仅支持页面顶层 Frame，请先将标准 Frame 放到页面顶层');
 if(!Array.isArray(ids)||!ids.length||ids.length>40||new Set(ids).size!==ids.length)throw Error('请选择 1–40 套不同主题');
 if(ids.length*s.nodes>100000)throw Error('本次批量超过 100000 个图层，请减少主题数量');
 const themes=ids.map(selectedTheme);
 const preflight=themes.flatMap(t=>plan(s,library,t));
 await prepareFonts(preflight,f=>figma.loadFontAsync(f));ensure();
 const page=figma.currentPage,created:FrameNode[]=[];
 figma.commitUndo();
 try{
  const columns=Math.min(4,themes.length),gap=80;
  const initialX=Math.max(s.frame.x+s.frame.width,...page.children.map(n=>n.x+n.width))+gap;
  for(let i=0;i<themes.length;i++){
   ensure();
   const clone=s.frame.clone();created.push(clone);
   clone.name=`${s.frame.name} · ${themes[i].name}`;
   clone.x=initialX+(i%columns)*(s.frame.width+gap);clone.y=s.frame.y+Math.floor(i/columns)*(s.frame.height+gap);
   const target=scanFrame(clone,figma.mixed);execute(plan(target,library,themes[i],s));
  }
 }catch(e){for(const f of created)if(!f.removed)f.remove();throw e;}
 figma.commitUndo();undo.push({kind:'batch',frames:created,fingerprints:created.map(fingerprint)});if(undo.length>20)undo.shift();
 send('done',{message:`已生成 ${created.length} 个主题 Frame，原始 Frame 保持不变。`,canUndo:true});
}
async function undoLast(){
 const s=ensure(),last=undo[undo.length-1];if(!last)throw Error('没有可撤销的插件操作');
 if(last.kind==='apply'){
  const patches=reversePatches(last.patches);await prepareFonts(patches,f=>figma.loadFontAsync(f));ensure();
  figma.commitUndo();execute(patches);figma.commitUndo();guard=fingerprint(s.frame);
 }else{
  if(last.frames.some((f,i)=>f.removed||fingerprint(f)!==last.fingerprints[i]))throw Error('生成的 Frame 已被编辑或移动，为防止丢失修改，拒绝删除；请使用 Figma 撤销历史');
  figma.commitUndo();last.frames.forEach(f=>f.remove());figma.commitUndo();
 }
 undo.pop();send('done',{message:'已撤销上一次插件操作。',canUndo:undo.length>0});
}
async function testFixture(){
 const page=figma.currentPage;await figma.loadFontAsync({family:'Inter',style:'Regular'});await figma.loadFontAsync({family:'Inter',style:'Bold'});
 if(figma.currentPage.id!==page.id)throw Error('页面已变化，请重试');
 const f=figma.createFrame();f.name='Frame Skin · 测试 Frame';f.resize(360,420);f.x=Math.max(0,...page.children.filter(n=>n!==f).map(n=>n.x+n.width))+100;
 f.layoutMode='VERTICAL';f.primaryAxisSizingMode='FIXED';f.counterAxisSizingMode='FIXED';f.paddingTop=24;f.paddingBottom=24;f.paddingLeft=24;f.paddingRight=24;f.itemSpacing=16;
 f.fills=[{type:'SOLID',color:{r:1,g:1,b:1},opacity:.9}];f.cornerRadius=20;
 const label=figma.createText();label.fontName={family:'Inter',style:'Regular'};label.characters='Frame Skin · Color test';label.fontSize=20;label.fills=[{type:'SOLID',color:{r:.1,g:.1,b:.1}}];f.appendChild(label);
 const card=figma.createRectangle();card.resize(280,100);card.cornerRadius=12;card.opacity=.8;card.fills=[{type:'SOLID',color:{r:.2,g:.4,b:.8},opacity:.7}];card.strokes=[{type:'SOLID',color:{r:.4,g:.4,b:.4}}];card.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:.2},offset:{x:0,y:4},radius:8,visible:true,blendMode:'NORMAL'}];f.appendChild(card);
 const mixed=figma.createText();mixed.characters='Mixed text colors';mixed.fontSize=14;mixed.setRangeFills(0,5,[{type:'SOLID',color:{r:.2,g:.4,b:.8}}]);mixed.setRangeFills(5,mixed.characters.length,[{type:'SOLID',color:{r:.1,g:.1,b:.1}}]);mixed.setRangeFontName(0,5,{family:'Inter',style:'Bold'});f.appendChild(mixed);
 const gradient=figma.createRectangle();gradient.resize(280,40);gradient.fills=[{type:'GRADIENT_LINEAR',gradientTransform:[[1,0,0],[0,1,0]],gradientStops:[{position:0,color:{r:1,g:0,b:0,a:1}},{position:1,color:{r:0,g:0,b:1,a:1}}]}];f.appendChild(gradient);
 const locked=figma.createRectangle();locked.resize(280,24);locked.fills=[{type:'SOLID',color:{r:1,g:0,b:0}}];f.appendChild(locked);locked.locked=true;
 try{
  const original=fingerprint(f),test=scanFrame(f,figma.mixed),lib=extendLibrary(emptyLibrary(),test.colors);
  const theme={id:'test',name:'Validation',colors:Object.fromEntries(lib.tokens.map((t,i)=>[t.id,['#123456','#ABCDEF','#297AC4','#789012','#F0E1D2'][i%5]]))};
  const patches=plan(test,lib,theme);await prepareFonts(patches,font=>figma.loadFontAsync(font));
  if(figma.currentPage.id!==page.id)throw Error('测试期间页面已变化');
  execute(patches);
  if(!patches.length||!test.slots.every(slot=>same(slot.read(),themedValue(slot.original,lib,theme))))throw Error('颜色替换断言失败');
  if(!test.issues.some(i=>i.reason.includes('渐变'))||!test.issues.some(i=>i.reason.includes('锁定')))throw Error('兼容性检查断言失败');
  execute(reversePatches(patches));
  if(fingerprint(f)!==original)throw Error('还原后几何、文字或颜色属性断言失败');
  fixturePassed=true;figma.currentPage.selection=[f];figma.viewport.scrollAndZoomIntoView([f]);
  await doScan();send('done',{message:`测试通过：${test.slots.length} 个颜色属性替换准确，撤销后全部属性一致；渐变和锁定层已跳过。现在可选择标准 Frame 扫描并批量生成。`,canUndo:false,fixturePassed:true});
 }catch(e){if(!f.removed)f.remove();throw e;}
}
figma.on('selectionchange',()=>{if(scan&&(figma.currentPage.id!==pageId||figma.currentPage.selection.length!==1||figma.currentPage.selection[0].id!==scan.frame.id))send('stale',{message:'选择已变化，请扫描当前 Frame。'});});
figma.on('currentpagechange',()=>{scan=null;undo=[];send('stale',{message:'页面已变化，请重新扫描。'});});
let ready:Promise<void>=(async()=>{
 try{const stored=await figma.clientStorage.getAsync(STORE);if(stored)library=validateLibrary(stored);}catch(e){send('error',{message:'本地主题库读取失败：'+errorText(e)+'。可通过 JSON 导入恢复；未自动覆盖存储。'});}
 send('init',{library});
})();
figma.ui.onmessage=async(message:unknown)=>{
 if(!message||typeof message!=='object')return;
 const m=message as {type:string;library?:unknown;themeId?:unknown;themeIds?:unknown};
 if(busy){send('error',{message:'正在处理上一项操作，请稍候'});return;}busy=true;send('busy',{busy:true});
 try{
  await ready;
  if(m.type==='scan'){if(m.library)await saveLibrary(m.library);await doScan();}
  else if(m.type==='save'){await saveLibrary(m.library);send('saved',{library});}
  else if(m.type==='apply'){await saveLibrary(m.library);send('saved',{library});await apply(m.themeId);}
  else if(m.type==='batch'){await saveLibrary(m.library);send('saved',{library});await batch(m.themeIds);}
  else if(m.type==='undo')await undoLast();
  else if(m.type==='test')await testFixture();
  else throw Error('不支持的操作');
 }catch(e){send('error',{message:errorText(e)});}finally{busy=false;send('busy',{busy:false});}
};
