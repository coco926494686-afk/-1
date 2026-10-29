export interface Token { id: string; name: string }
export interface Mapping { source: string; tokenId: string }
export interface Theme { id: string; name: string; colors: Record<string, string> }
export interface Library { version: 1; tokens: Token[]; mappings: Mapping[]; themes: Theme[] }
export interface Issue { node: string; reason: string }
export interface ColorInfo { source: string; count: number; roles: string[] }
export const HEX = /^#[\da-f]{6}$/i;
export function validHex(value: unknown): value is string { return typeof value === 'string' && HEX.test(value); }
export function toHex(c: RGB): string {
 return '#' + [c.r,c.g,c.b].map(v => Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('').toUpperCase();
}
export function toRGB(hex: string): RGB {
 if (!validHex(hex)) throw Error('颜色必须是 #RRGGBB 格式');
 return {r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255};
}
export function uid(): string { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10); }
const presets: [string,string,string,string,string][] = [
 ['经典蓝','#2563EB','#F8FAFC','#FFFFFF','#172033'], ['午夜蓝','#60A5FA','#0F172A','#1E293B','#F1F5F9'],
 ['森林','#16856B','#F1F8F4','#FFFFFF','#163C31'], ['薄荷','#0D9488','#ECFDF5','#FFFFFF','#134E4A'],
 ['紫罗兰','#7C3AED','#F5F3FF','#FFFFFF','#2E1065'], ['薰衣草','#A78BFA','#1E1730','#302444','#F5F3FF'],
 ['玫瑰','#E11D48','#FFF1F2','#FFFFFF','#4C0519'], ['樱花','#DB2777','#FDF2F8','#FFFFFF','#500724'],
 ['暖橙','#EA580C','#FFF7ED','#FFFFFF','#431407'], ['琥珀','#D97706','#FFFBEB','#FFFFFF','#451A03'],
 ['海洋','#0284C7','#F0F9FF','#FFFFFF','#082F49'], ['冰川','#0891B2','#ECFEFF','#FFFFFF','#164E63'],
 ['青柠','#4D7C0F','#F7FEE7','#FFFFFF','#1A2E05'], ['橄榄','#65743A','#F7F8F0','#FFFFFF','#293214'],
 ['咖啡','#916345','#FAF5F0','#FFFFFF','#38251B'], ['沙丘','#A17843','#FBF7EF','#FFFFFF','#40301E'],
 ['石墨','#52525B','#FAFAFA','#FFFFFF','#18181B'], ['极夜','#A1A1AA','#09090B','#18181B','#FAFAFA'],
 ['靛青','#4F46E5','#EEF2FF','#FFFFFF','#1E1B4B'], ['珊瑚','#E76F51','#FFF5F1','#FFFFFF','#4A261D'],
 ['葡萄','#9333EA','#FAF5FF','#FFFFFF','#3B0764'], ['深海','#22D3EE','#083344','#164E63','#ECFEFF'],
 ['酒红','#BE123C','#FFF1F2','#FFFFFF','#4C0519'], ['松柏','#34D399','#052E26','#064E3B','#ECFDF5']
];
export function emptyLibrary(): Library { return {version:1,tokens:[],mappings:[],themes:[]}; }
function role(source:string, roles:string[]):string {
 const {r,g,b}=toRGB(source); const hi=Math.max(r,g,b),lo=Math.min(r,g,b),lum=.2126*r+.7152*g+.0722*b;
 if (hi-lo>.18) return 'accent';
 if (roles.includes('文字') && lum<.65) return 'text';
 if (lum>.95) return 'surface'; if(lum>.82) return 'background';
 if(lum<.3) return 'text'; return 'border';
}
export function extendLibrary(lib:Library, colors:ColorInfo[]):Library {
 const next=structuredCloneSafe(lib);
 for(const color of colors) if(!next.mappings.some(m=>m.source===color.source)) {
  const baseId='c'+color.source.slice(1).toLowerCase();
  let id=baseId;let suffix=1;while(next.tokens.some(t=>t.id===id))id=baseId+'-'+suffix++;
  const semantic=role(color.source,color.roles);
  next.tokens.push({id,name:({accent:'品牌 / 强调',text:'文字 / 主要',surface:'表面 / 卡片',background:'背景 / 画布',border:'边框 / 次要'} as Record<string,string>)[semantic]+' '+color.source});
  next.mappings.push({source:color.source,tokenId:id});
  for(const theme of next.themes) {
   const preset=presets.find(p=>p[0]===theme.name);
   theme.colors[id]=preset ? ({accent:preset[1],background:preset[2],surface:preset[3],text:preset[4],border:mix(preset[3],preset[4],.2)} as Record<string,string>)[semantic] : color.source;
  }
 }
 if(!next.themes.length) next.themes=presets.map(p=>({id:uid(),name:p[0],colors:Object.fromEntries(next.tokens.map(t=>{
  const c=next.mappings.find(m=>m.tokenId===t.id)?.source||'#000000';
  const cr=colors.find(v=>v.source===c);const kind=role(c,cr?.roles||[]);
  return [t.id,({accent:p[1],background:p[2],surface:p[3],text:p[4],border:mix(p[3],p[4],.2)} as Record<string,string>)[kind]];
 }))}));
 return next;
}
function mix(a:string,b:string,k:number):string { const x=toRGB(a),y=toRGB(b);return toHex({r:x.r*(1-k)+y.r*k,g:x.g*(1-k)+y.g*k,b:x.b*(1-k)+y.b*k}); }
export function structuredCloneSafe<T>(value:T):T { return JSON.parse(JSON.stringify(value)); }
export function replacement(lib:Library,theme:Theme,source:string):string|undefined {
 const map=lib.mappings.find(m=>m.source===source);return map ? theme.colors[map.tokenId] : undefined;
}
export function validateLibrary(value:unknown):Library {
 if(!value || typeof value!=='object') throw Error('JSON 必须是主题库对象');
 const v=value as Library;
 if(v.version!==1 || !Array.isArray(v.tokens)||!Array.isArray(v.mappings)||!Array.isArray(v.themes)) throw Error('不支持的 JSON 格式或版本');
 if(v.tokens.length>1000||v.mappings.length>2000||v.themes.length>200) throw Error('最多 1000 个 Token、2000 个映射和 200 套主题');
 const ids=new Set<string>(), names=new Set<string>();
 const clean:Library={version:1,tokens:[],mappings:[],themes:[]};
 function str(s:unknown,max:number):s is string{return typeof s==='string'&&s.trim().length>0&&s.length<=max;}
 for(const t of v.tokens) {
  if(!t||!str(t.id,80)||!str(t.name,100)||ids.has(t.id)||['__proto__','constructor','prototype'].includes(t.id))throw Error('Token ID 重复或名称无效');
  ids.add(t.id);clean.tokens.push({id:t.id,name:t.name.trim()});
 }
 for(const m of v.mappings){
  if(!m||!validHex(m.source)||!ids.has(m.tokenId)||names.has(m.source.toUpperCase()))throw Error('源颜色映射无效或重复');
  names.add(m.source.toUpperCase());clean.mappings.push({source:m.source.toUpperCase(),tokenId:m.tokenId});
 }
 const themeIds=new Set<string>();
 for(const t of v.themes){
  if(!t||!str(t.id,80)||themeIds.has(t.id)||!str(t.name,80)||!t.colors||typeof t.colors!=='object'||Array.isArray(t.colors))throw Error('主题 ID 或名称无效');
  themeIds.add(t.id);const colors:Record<string,string>={};
  for(const token of clean.tokens){if(!Object.prototype.hasOwnProperty.call(t.colors,token.id)||!validHex(t.colors[token.id]))throw Error('每套主题必须包含所有 Token 的 #RRGGBB 颜色');colors[token.id]=t.colors[token.id].toUpperCase();}
  clean.themes.push({id:t.id,name:t.name.trim(),colors});
 }
 return clean;
}
