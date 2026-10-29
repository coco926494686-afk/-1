import { ColorInfo, Issue, Library, Theme, replacement, structuredCloneSafe, toHex, toRGB } from './model';
export type Property = 'fills'|'strokes'|'effects'|'range';
export type Value = readonly Paint[] | readonly Effect[];
export interface Slot {
 node:SceneNode; key:string; property:Property; start?:number; end?:number;
 original:Value; expected:Value; read:()=>Value; write:(v:Value)=>void;
}
export interface Scan { frame:FrameNode; slots:Slot[]; colors:ColorInfo[]; issues:Issue[]; nodes:number }
export interface Patch { slot:Slot; before:Value; after:Value }
/** Figma round-trips RGB(A) as float32. Keep the tolerance far below one 8-bit step. */
export function same(a:unknown,b:unknown,inColor=false):boolean {
 if(typeof a==='number'&&typeof b==='number')return inColor?Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-6:Object.is(a,b);
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 if(Array.isArray(a)!==Array.isArray(b))return false;
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>same(v,b[i]));
 const x=a as Record<string,unknown>,y=b as Record<string,unknown>;
 const keys=Object.keys(x).filter(k=>x[k]!==undefined).sort(),other=Object.keys(y).filter(k=>y[k]!==undefined).sort();
 return keys.length===other.length&&keys.every((k,i)=>k===other[i]&&same(x[k],y[k],inColor||k==='color'||k==='secondaryColor'));
}
export function mismatch(actual:unknown,expected:unknown):string {
 return '预期 '+JSON.stringify(expected).slice(0,500)+'；实际 '+JSON.stringify(actual).slice(0,500);
}
const copy=<T>(x:T):T=>structuredCloneSafe(x);
function bound(value:unknown):boolean {
 if(!value||typeof value!=='object')return false;
 const b=(value as {boundVariables?:object}).boundVariables;return !!b&&Object.keys(b).length>0;
}
export function scanFrame(frame:FrameNode, mixed:symbol):Scan {
 const slots:Slot[]=[], issues:Issue[]=[],colorMap=new Map<string,ColorInfo>();let nodes=0;
 const issue=(node:SceneNode,reason:string)=>issues.push({node:node.name,reason});
 function collect(slot:Slot){
  if(slots.length>=50000)throw Error('颜色属性过多，请缩小所选 Frame');
  slots.push(slot);
  for(const item of slot.original){
   if(item.type==='SOLID'||item.type==='DROP_SHADOW'||item.type==='INNER_SHADOW'||item.type==='NOISE'){
    if(bound(item))continue;
    const itemColors=[item.color];if(item.type==='NOISE'&&item.noiseType==='DUOTONE')itemColors.push(item.secondaryColor);
    for(const color of itemColors){
    const source=toHex(color),role=slot.property==='effects'?'效果':slot.node.type==='TEXT'&& (slot.property==='fills'||slot.property==='range')?'文字':slot.property==='strokes'?'描边':'填充';
    const entry=colorMap.get(source)||{source,count:0,roles:[]};entry.count++;if(!entry.roles.includes(role))entry.roles.push(role);colorMap.set(source,entry);
    }
   }
  }
 }
 function visit(node:SceneNode,path:string){
  if(++nodes>10000)throw Error('Frame 超过 10000 个图层，请拆分后扫描');
  if(node.locked){issue(node,'锁定图层及其子图层已跳过');return;}
  if(['INSTANCE','COMPONENT','COMPONENT_SET'].includes(node.type)){issue(node,'组件实例 / 母版整体跳过，保留覆盖和组件结构');return;}
  for(const property of ['fills','strokes','effects'] as const){
   if(!(property in node))continue;
   const n=node as SceneNode & {fills:readonly Paint[]|symbol;strokes:readonly Paint[];effects:readonly Effect[];fillStyleId:string|symbol;strokeStyleId:string;effectStyleId:string};
   const value=n[property];
   const style=property==='fills'?n.fillStyleId:property==='strokes'?n.strokeStyleId:n.effectStyleId;
   if(value===mixed&&node.type==='TEXT'&&property==='fills'){
    for(const segment of node.getStyledTextSegments(['fills','fillStyleId'])){
     if(segment.fillStyleId){issue(node,'文字区间绑定共享样式，已跳过');continue;}
     addPaintSlot(node,'range',segment.fills,path+':range:'+segment.start,()=>node.getRangeFills(segment.start,segment.end) as readonly Paint[],v=>node.setRangeFills(segment.start,segment.end,v as Paint[]),segment.start,segment.end);
    }
    continue;
   }
   if(typeof value==='symbol'){issue(node,property+' 为混合属性，无法安全修改');continue;}
   if(style){issue(node,property+' 绑定共享样式，已跳过（不会分离样式）');continue;}
   if(property==='effects'){
    const effects=value as readonly Effect[];
    if(effects.some(e=>bound(e)))issue(node,'变量绑定效果已保留');
    if(effects.some(e=>(e.type==='DROP_SHADOW'||e.type==='INNER_SHADOW'||e.type==='NOISE')&&!bound(e))){
     const original=copy(effects);
     collect({node,key:path+':effects',property,original,expected:copy(original),read:()=>n.effects,write:v=>{n.effects=v as Effect[];}});
    }
   }else addPaintSlot(node,property,value as readonly Paint[],path+':'+property,()=>n[property] as readonly Paint[],v=>{n[property]=v as Paint[];});
  }
  if('children' in node)node.children.forEach((child,index)=>visit(child,path+'/'+index));
 }
 function addPaintSlot(node:SceneNode,property:Property,paints:readonly Paint[],key:string,read:()=>Value,write:(v:Value)=>void,start?:number,end?:number){
  if(paints.some(p=>p.type!=='SOLID'))issue(node,property+' 中的渐变 / 图片 / 视频保持原样');
  if(paints.some(p=>bound(p)))issue(node,property+' 中的变量绑定颜色已保留');
  if(!paints.some(p=>p.type==='SOLID'&&!bound(p)))return;
  const original=copy(paints);collect({node,key,property,start,end,original,expected:copy(original),read,write});
 }
 visit(frame,'root');return {frame,slots,issues,colors:[...colorMap.values()].sort((a,b)=>b.count-a.count),nodes};
}
export function themedValue(value:Value,lib:Library,theme:Theme):Value {
 return value.map(item=>{
  if((item.type==='SOLID'||item.type==='DROP_SHADOW'||item.type==='INNER_SHADOW'||item.type==='NOISE')&&!bound(item)){
   const target=replacement(lib,theme,toHex(item.color));
   const result=copy(item);
   if(target&&target!==toHex(item.color))Object.assign(result,{color:{...item.color,...toRGB(target)}});
   if(item.type==='NOISE'&&item.noiseType==='DUOTONE'){
    const secondary=replacement(lib,theme,toHex(item.secondaryColor));
    if(secondary&&secondary!==toHex(item.secondaryColor))Object.assign(result,{secondaryColor:{...item.secondaryColor,...toRGB(secondary)}});
   }
   return result;
  }
  return copy(item);
 }) as Value;
}
export function plan(scan:Scan,lib:Library,theme:Theme,baseline?:Scan):Patch[]{
 const originalByKey=new Map((baseline||scan).slots.map(s=>[s.key,s.original]));
 return scan.slots.flatMap(slot=>{
  if(slot.node.removed)throw Error('图层已删除，请重新扫描');
  if(!same(slot.read(),slot.expected))throw Error('扫描后颜色被外部修改，请重新扫描后再应用');
  const base=originalByKey.get(slot.key);if(!base)throw Error('复制图层结构不匹配，已停止');
  const after=themedValue(base,lib,theme),before=copy(slot.read());
  return same(before,after)?[]:[{slot,before,after}];
 });
}
export async function prepareFonts(patches:Patch[],load:(font:FontName)=>Promise<void>):Promise<void>{
 const fonts=new Map<string,FontName>();
 for(const p of patches)if(p.slot.node.type==='TEXT')for(const font of p.slot.node.getRangeAllFontNames(0,p.slot.node.characters.length))fonts.set(font.family+'\0'+font.style,font);
 for(const font of fonts.values())await load(font);
}
/** All-or-nothing for writable properties; never write geometry, style IDs or text content. */
export function execute(patches:Patch[]):void {
 for(const p of patches)if(p.slot.node.removed||!same(p.slot.read(),p.before))throw Error('应用前图层已变化，请重新扫描');
 const done:Patch[]=[];
 try {for(const p of patches){
   const requested=copy(p.after);p.slot.write(requested);done.push(p);
   const actual=copy(p.slot.read());
   if(!same(actual,requested))throw Error(p.slot.node.name+' / '+p.slot.property+' 颜色写入校验失败：'+mismatch(actual,requested));
   // Record canonical host values, not requested doubles, for undo and subsequent switches.
   p.after=actual;p.slot.expected=copy(actual);
  }}
 catch(error){
  let failed=false;
  for(const p of done.reverse())try{p.slot.write(copy(p.before));p.slot.expected=copy(p.slot.read());}catch{failed=true;}
  throw Error(failed?'写入失败且部分回滚被 Figma 拒绝，请立即使用 Figma 撤销':`写入失败，已回滚：${String(error)}`);
 }
}
export function reversePatches(patches:Patch[]):Patch[]{
 for(const p of patches)if(p.slot.node.removed||!same(p.slot.read(),p.after))throw Error('操作后图层颜色已改变，拒绝覆盖；请使用 Figma 历史或重新扫描');
 return patches.map(p=>({slot:p.slot,before:copy(p.after),after:copy(p.before)}));
}
// Captures geometry, text, layouts, paints and structural edits before deleting generated copies.
const fingerprintFields=['name','type','visible','locked','opacity','blendMode','x','y','width','height','rotation','relativeTransform','constraints','layoutAlign','layoutGrow','layoutPositioning','layoutMode','layoutWrap','primaryAxisSizingMode','counterAxisSizingMode','primaryAxisAlignItems','counterAxisAlignItems','counterAxisAlignContent','paddingLeft','paddingRight','paddingTop','paddingBottom','itemSpacing','counterAxisSpacing','strokesIncludedInLayout','itemReverseZIndex','minWidth','maxWidth','minHeight','maxHeight','layoutSizingHorizontal','layoutSizingVertical','clipsContent','isMask','maskType','cornerRadius','topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius','cornerSmoothing','fills','fillStyleId','strokes','strokeStyleId','strokeWeight','strokeAlign','strokeCap','strokeJoin','dashPattern','effects','effectStyleId','characters','fontName','fontSize','textStyleId','textAlignHorizontal','textAlignVertical','textAutoResize','lineHeight','letterSpacing','textCase','textDecoration','paragraphSpacing','paragraphIndent','componentProperties','variantProperties','reactions','boundVariables','exportSettings','vectorPaths','vectorNetwork','arcData','booleanOperation','strokeTopWeight','strokeBottomWeight','strokeLeftWeight','strokeRightWeight','strokeMiterLimit','backgrounds','backgroundStyleId','layoutGrids','gridStyleId','overflowDirection','numberOfFixedChildren','textTruncation','maxLines','hyperlink','listSpacing','hangingPunctuation','hangingList','autoRename','description','explicitVariableModes'];
export function fingerprint(node:SceneNode):string {
 const data:Record<string,unknown>={id:node.id,parent:node.parent?.id};
 for(const key of fingerprintFields)try{if(key in node){const v=(node as unknown as Record<string,unknown>)[key];data[key]=typeof v==='symbol'?'MIXED':v;}}catch{data[key]='UNREADABLE';}
 if(node.type==='TEXT')data.runs=node.getStyledTextSegments(['fills','fillStyleId','fontName','fontSize','textStyleId','textCase','textDecoration','letterSpacing','lineHeight','hyperlink','listOptions','indentation']);
 if(typeof node.getPluginDataKeys==='function')data.pluginData=Object.fromEntries(node.getPluginDataKeys().map(k=>[k,node.getPluginData(k)]));
 if('children'in node)data.children=node.children.map(fingerprint);
 // Stable keys prevent a host object's property order from looking like a document edit.
 return JSON.stringify(data,(_key,value)=>{
  if(value&&typeof value==='object'&&!Array.isArray(value))return Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]]));
  return value;
 });
}
