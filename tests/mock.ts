// A small in-memory Figma host. Tests exercise real production scan/transaction code.
export const MIXED=Symbol('mixed');let seq=0;
export const solid=(hex:string,opacity=1):SolidPaint=>({type:'SOLID',color:{r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255},opacity});
const deep=<T>(v:T):T=>JSON.parse(JSON.stringify(v));

// Figma uses float32 channels and can expose host objects in a different key order.
export function normalize<T>(v:T):T {
 function walk(x:any,key=''):any{
  if(x===null||typeof x!=='object')return typeof x==='number'&&['r','g','b','a'].includes(key)?Math.fround(x):x;
  if(Array.isArray(x))return x.map(v=>walk(v));
  return Object.fromEntries(Object.keys(x).sort().reverse().map(k=>[k,walk(x[k],k)]));
 }
 return walk(v);
}

export class MockNode {
 id='n'+(++seq);name='Node';type:string='RECTANGLE';parent:MockNode|null=null;children:MockNode[]=[];removed=false;
 x=0;y=0;width=100;height=60;rotation=0;opacity=.7;cornerRadius=12;visible=true;locked=false;blendMode='NORMAL';
 layoutMode='NONE';layoutGrow=0;itemSpacing=8;paddingLeft=12;paddingRight=12;paddingTop=10;paddingBottom=10;
 primaryAxisSizingMode='FIXED';counterAxisSizingMode='FIXED';constraints={horizontal:'MIN',vertical:'MIN'};
 strokes:Paint[]=[];effects:Effect[]=[];fillStyleId:string|symbol='';strokeStyleId='';effectStyleId='';
 fontName:FontName={family:'Inter',style:'Regular'};fontSize=16;textStyleId='';textCase='ORIGINAL';textDecoration='NONE';letterSpacing={value:0,unit:'PIXELS'};lineHeight={unit:'AUTO'};characters='';
 _fills:Paint[]=[solid('#FFFFFF')];runs:{start:number;end:number;fills:Paint[];fillStyleId:string;fontName:FontName}[]=[];
 failWrite=false;normalizeColors=false;
 constructor(type='RECTANGLE'){this.type=type;}
 get fills():Paint[]|symbol{return this.runs.length?MIXED:this.normalizeColors?normalize(this._fills):this._fills;}
 set fills(value:Paint[]|symbol){if(this.failWrite)throw Error('Write rejected');this.runs=[];this._fills=deep(value as Paint[]);if(this.normalizeColors)this._fills=normalize(this._fills);}
 appendChild(n:MockNode){if(n.parent)n.parent.children=n.parent.children.filter(c=>c!==n);n.parent=this;this.children.push(n);}
 resize(w:number,h:number){this.width=w;this.height=h;}
 remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 clone():MockNode{
  const c=new MockNode(this.type);
  for(const key of Object.keys(this))if(!['id','parent','children','removed'].includes(key)&&typeof (this as any)[key]!=='function')(c as any)[key]=deep((this as any)[key]);
  for(const child of this.children)c.appendChild(child.cloneDetached());
  this.parent?.appendChild(c);return c;
 }
 cloneDetached():MockNode{const parent=this.parent;this.parent=null;const c=this.clone();this.parent=parent;return c;}
 getStyledTextSegments(){
  const result=(this.runs.length?this.runs:[{start:0,end:this.characters.length,fills:this._fills,fillStyleId:typeof this.fillStyleId==='string'?this.fillStyleId:'',fontName:this.fontName}]).map(r=>({...deep(r),characters:this.characters.slice(r.start,r.end),fontSize:this.fontSize,textStyleId:this.textStyleId,textCase:this.textCase,textDecoration:this.textDecoration,letterSpacing:this.letterSpacing,lineHeight:this.lineHeight}));
  return this.normalizeColors?normalize(result):result;
 }
 getRangeFills(start:number,end:number):Paint[]{const result=deep(this.runs.find(r=>r.start===start&&r.end===end)?.fills||this._fills);return this.normalizeColors?normalize(result):result;}
 setRangeFills(start:number,end:number,fills:Paint[]){
  if(this.runs.length){const r=this.runs.find(r=>r.start===start&&r.end===end);if(r){r.fills=deep(fills);return;}}
  if(start===0&&end===this.characters.length){this._fills=deep(fills);return;}
  const original=deep(this._fills);
  this.runs=[];if(start>0)this.runs.push({start:0,end:start,fills:original,fillStyleId:'',fontName:this.fontName});
  this.runs.push({start,end,fills:deep(fills),fillStyleId:'',fontName:this.fontName});
  if(end<this.characters.length)this.runs.push({start:end,end:this.characters.length,fills:original,fillStyleId:'',fontName:this.fontName});
 }
 setRangeFontName(start:number,end:number,font:FontName){for(const r of this.runs)if(r.start===start&&r.end===end)r.fontName=font;}
 getRangeAllFontNames(){return this.runs.length?this.runs.map(r=>r.fontName):[this.fontName];}
 async exportAsync(){return new Uint8Array([137,80,78,71]);}
}
export function frameFixture(){
 const page=new MockNode('PAGE'),frame=new MockNode('FRAME');frame.name='Standard';frame.layoutMode='VERTICAL';frame.width=360;frame.height=600;page.appendChild(frame);
 const text=new MockNode('TEXT');text.name='Title';text.characters='Hello';text.fills=[solid('#111111',.6)];frame.appendChild(text);
 const card=new MockNode();card.name='Card';card.fills=[solid('#2563EB',.4)];card.strokes=[solid('#CCCCCC',.3)];card.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:.25},offset:{x:2,y:5},radius:8,visible:true,blendMode:'NORMAL'}];frame.appendChild(card);
 return {page,frame,text,card,asFrame:frame as unknown as FrameNode};
}
export function host(normalizeHost=false){
 const f=frameFixture();for(const n of [f.frame,...f.frame.children])n.normalizeColors=normalizeHost;const messages:any[]=[];const listeners:Record<string,()=>void>={};const storage=new Map();
 const figma:any={mixed:MIXED,currentPage:f.page,ui:{postMessage:(m:any)=>messages.push(m)},showUI:()=>{},commitUndo:()=>{},loadFontAsync:async()=>{},clientStorage:{getAsync:async(k:string)=>storage.get(k),setAsync:async(k:string,v:any)=>storage.set(k,v)},viewport:{scrollAndZoomIntoView:()=>{}},on:(name:string,fn:()=>void)=>listeners[name]=fn};
 Object.defineProperty(f.page,'selection',{writable:true,value:[f.frame],enumerable:false});
 for(const [name,type]of [['createFrame','FRAME'],['createRectangle','RECTANGLE'],['createText','TEXT']])figma[name]=()=>{const n=new MockNode(type);n.normalizeColors=normalizeHost;figma.currentPage.appendChild(n);return n;};
 return {...f,figma,messages,storage,listeners};
}
