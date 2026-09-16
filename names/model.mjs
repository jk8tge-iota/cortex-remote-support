export const MAX_BYTES = 8 * 1024 * 1024;
export const codes = ['AI','BI','CI','DI','AII','BII','CII','DII'];
export const tiles = ['scenes','preset','tempo','expression1','expression2','tuner','gigView','modes','favorites'];
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const int = (x,a,b) => Number.isInteger(x) && x >= a && x <= b;
const own = (o,k) => Object.hasOwn(o,k);
const fail = (key='invalidFile') => { throw new Error(key); };
const need = x => { if (!x) fail(); };
export const count = text => [...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text)].length;
export const clean = text => text.replace(/\r\n|[\r\n\t]/g,' ').replace(/^[\p{White_Space}\u200B]+|[\p{White_Space}\u200B]+$/gu,'') || null;
export const limit = f => f.kind === 'setlist' ? 64 : f.kind === 'preset' ? 15 : 32;
export const key = f => [f.kind,f.setlist ?? -1,f.preset ?? -1,f.index ?? -1].join(':');
export const code = p => `${Math.floor((p-1)/4)+1}${'ABCD'[(p-1)%4]}`;
export function validField(f) {
  if (!object(f) || Object.keys(f).some(k=>!['kind','setlist','preset','index'].includes(k))) return false;
  if(f.kind==='mode') return f.setlist == null && f.preset == null && int(f.index,0,2);
  if(!int(f.setlist,0,12)) return false;
  if(f.kind==='setlist') return f.preset == null && f.index == null;
  if(!int(f.preset,1,256)) return false;
  if(f.kind==='preset') return f.index == null;
  return ['scene','stomp'].includes(f.kind) && int(f.index,0,7);
}
export function get(names,f) {
  if(f.kind==='mode') return names.modes?.[f.index] ?? null;
  if(f.kind==='setlist') return names.setlists?.[f.setlist]?.name ?? null;
  if(f.kind==='preset') return names.presetDisplayNames?.[f.setlist]?.[f.preset] ?? null;
  return names.setlists?.[f.setlist]?.presets?.[f.preset]?.[f.kind==='scene'?'scenes':'stomps']?.[f.index] ?? null;
}
function assign(o,k,v) { if(v===null) delete o[k]; else o[k]=v; }
export function set(names,f,v) {
  if(!validField(f)) fail();
  if(f.kind==='mode') { names.modes ??= {}; assign(names.modes,f.index,v); return; }
  if(f.kind==='preset') {
    names.presetDisplayNames ??= {}; const list=names.presetDisplayNames[f.setlist] ??= {};
    assign(list,f.preset,v); if(!Object.keys(list).length) delete names.presetDisplayNames[f.setlist]; return;
  }
  names.setlists ??= {}; const list=names.setlists[f.setlist] ??= {presets:{}};
  if(f.kind==='setlist') assign(list,'name',v);
  else {
    list.presets ??= {}; const preset=list.presets[f.preset] ??= {scenes:{},stomps:{}};
    const type=f.kind==='scene'?'scenes':'stomps'; preset[type] ??= {}; assign(preset[type],f.index,v);
    if(!preset.name && !Object.keys(preset.scenes??{}).length && !Object.keys(preset.stomps??{}).length) delete list.presets[f.preset];
  }
  if(!list.name && !Object.keys(list.presets??{}).length) delete names.setlists[f.setlist];
}
function namesValid(n) {
  need(object(n) && n.version===2);
  const text=(s,max)=>need(typeof s==='string' && clean(s)===s && count(s)<=max);
  const dict=(d,a,b,each)=>{ need(object(d)); for(const [k,v] of Object.entries(d)) { need(String(Number(k))===k && int(Number(k),a,b)); each(v); } };
  dict(n.modes??{},0,2,v=>text(v,32));
  for(const field of ['slotNames','presetDisplayNames']) dict(n[field]??{},0,12,v=>{need(Object.keys(v).length>0);dict(v,1,field==='slotNames'?64:256,x=>text(x,64));});
  dict(n.setlists??{},0,12,list=>{
    need(object(list)&&object(list.presets)); if(list.name!=null) text(list.name,64);
    need(list.name!=null || Object.keys(list.presets??{}).length>0);
    dict(list.presets??{},1,256,p=>{
      need(object(p));if(p.name!=null) text(p.name,64);
      need(p.name!=null || Object.keys(p.scenes??{}).length>0 || Object.keys(p.stomps??{}).length>0);
      dict(p.scenes??{},0,7,v=>text(v,32));dict(p.stomps??{},0,7,v=>text(v,32));
    });
  });
}
export function validate(a) {
  need(object(a)); if(a.version!==3) fail('oldVersion');
  need(Number.isFinite(a.created)); namesValid(a.names);
  const c=a.controller; need(object(c)&&c.version===1&&int(c.channel,1,16)&&int(c.presetSlot,1,256)&&int(c.setlist,0,12)&&typeof c.keepAwake==='boolean');
  need(c.outputID==null||int(c.outputID,1,2147483647));
  const l=a.layout; need(object(l)&&l.version===3&&Array.isArray(l.order)&&l.order.length===tiles.length&&new Set(l.order).size===tiles.length&&l.order.every(x=>tiles.includes(x)));
  need(Array.isArray(l.hidden)&&JSON.stringify(l.hidden)===JSON.stringify(tiles.filter(x=>l.hidden.includes(x))));
  need(['presets','scenes','stomp'].includes(a.mode)&&a.modeSlots?.version===1&&Array.isArray(a.modeSlots.slots)&&a.modeSlots.slots.length===3&&new Set(a.modeSlots.slots).size===3&&a.modeSlots.slots.every(x=>int(x,0,2)));
  need(a.appPreferences?.version===1&&['en','ko','ja','de'].includes(a.appPreferences.language)&&typeof a.appPreferences.showControlHints==='boolean');
  need(a.favorites?.version===1&&Array.isArray(a.favorites.addresses));
  const address=x=>object(x)&&int(x.setlist,0,12)&&int(x.slot,1,256);
  need(a.favorites.addresses.every(address)&&new Set(a.favorites.addresses.map(x=>`${x.setlist}.${x.slot}`)).size===a.favorites.addresses.length);
  need(Array.isArray(a.endpoints)); const endpoints=new Set();
  for(const e of a.endpoints){need(object(e)&&['input','output'].includes(e.kind)&&int(e.token,1,2147483647)&&typeof e.name==='string');const k=`${e.kind}:${e.token}`;need(!endpoints.has(k));endpoints.add(k);}
  if(c.outputID!=null) need(endpoints.has(`output:${c.outputID}`));
  const f=a.feedback;need(object(f)&&f.version===1&&['followPresets','followScenes','followExpressions','followTempo'].every(k=>typeof f[k]==='boolean')&&Array.isArray(f.mappings));
  if(f.presetSceneDefaultsInstalled!=null) need(typeof f.presetSceneDefaultsInstalled==='boolean');
  if(f.sourceID!=null) need(endpoints.has(`input:${f.sourceID}`));
  const ids=new Set();
  for(const m of f.mappings){
    need(object(m)&&typeof m.id==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(m.id)&&!ids.has(m.id.toLowerCase()));ids.add(m.id.toLowerCase());
    need(endpoints.has(`input:${m.source}`)&&int(m.group,0,15)&&int(m.channel,1,16)&&typeof m.enabled==='boolean');
    const p=m.pattern,t=m.target;need(object(p)&&object(t)&&['cc','pc','continuous'].includes(p.kind)&&int(p.number,0,127)&&int(p.value,0,127));
    need(typeof p.inverted==='boolean'&&int(p.minimum,0,127)&&int(p.maximum,0,127));
    if(p.kind==='pc') need((p.msb==null&&p.lsb==null)||(int(p.msb,0,127)&&int(p.lsb,0,127)));
    else need(int(p.number,1,119)&&p.number!==32&&p.minimum<p.maximum);
    need(['preset','scene','expression'].includes(t.kind)&&Number.isInteger(t.index));
    if(t.kind==='expression') need(int(t.index,1,2)&&(t.address==null||address(t.address))&&p.kind==='continuous');
    else need(address(t.address)&&p.kind!=='continuous'&&(t.kind!=='scene'||int(t.index,0,7)));
  }
  const overlap=(p,q)=>p.number===q.number&&(p.kind==='pc'||q.kind==='pc'?p.kind===q.kind&&(p.msb==null||q.msb==null||(p.msb===q.msb&&p.lsb===q.lsb)):p.kind==='continuous'||q.kind==='continuous'||p.value===q.value);
  for(let i=0;i<f.mappings.length;i++) for(let j=0;j<i;j++) {const m=f.mappings[i],n=f.mappings[j];
    if(m.enabled&&n.enabled&&m.source===n.source&&m.group===n.group&&m.channel===n.channel&&overlap(m.pattern,n.pattern)) need(!(m.target.kind==='preset'||n.target.kind==='preset'||m.target.address==null||n.target.address==null||(m.target.address.setlist===n.target.address.setlist&&m.target.address.slot===n.target.address.slot)));
  }
  if(a.webNameEdits!=null) {
    const e=a.webNameEdits;need(object(e)&&e.version===1&&e.target==='quadCortexMini'&&typeof e.startedBlank==='boolean'&&Array.isArray(e.changes)&&e.changes.length<=56600);const seen=new Set();
    for(const ch of e.changes){need(object(ch)&&validField(ch.field)&&own(ch,'original')&&own(ch,'edited')&&ch.original!==ch.edited&&!seen.has(key(ch.field)));seen.add(key(ch.field));
      for(const k of ['original','edited']) if(ch[k]!==null) need(typeof ch[k]==='string'&&clean(ch[k])===ch[k]&&count(ch[k])<=(k==='original'&&ch.field.kind==='preset'?64:limit(ch.field)));
      need(get(a.names,ch.field)===ch.edited);
    }
  }
  return a;
}
export function parse(text) {if(new TextEncoder().encode(text).length>MAX_BYTES) fail('tooLarge'); let a;try{a=JSON.parse(text);}catch{fail();}return validate(a);}
export class Editor {
  constructor(archive,blank=false) {this.archive=structuredClone(validate(archive));this.archive.webNameEdits??={version:1,target:'quadCortexMini',startedBlank:blank,changes:[]};this.undoStack=[];this.redoStack=[];}
  apply(entries,group=null) {
    const edits=entries.map(({field,value})=>{need(validField(field));const after=clean(value);if(after&&count(after)>limit(field)) fail('tooLong');return {field,before:get(this.archive.names,field),after};}).filter(e=>e.before!==e.after);
    if(!edits.length)return;
    if(new Set(edits.map(e=>key(e.field))).size!==edits.length) fail();
    const previous=this.undoStack.at(-1);
    if(group&&previous?.group===group&&edits.length===1&&previous.edits.length===1&&key(previous.edits[0].field)===key(edits[0].field)) previous.edits[0].after=edits[0].after;
    else {this.undoStack.push({edits,group});if(this.undoStack.length>100)this.undoStack.shift();}
    for(const e of edits)this.write(e.field,e.after);this.redoStack=[];
  }
  write(field,value) {
    const changes=this.archive.webNameEdits.changes, i=changes.findIndex(c=>key(c.field)===key(field));
    const original=i<0?get(this.archive.names,field):changes[i].original;
    set(this.archive.names,field,value);
    if(i>=0)changes.splice(i,1);
    if(original!==value)changes.push({field,original,edited:value});
  }
  undo(){const t=this.undoStack.pop();if(!t)return;for(const e of t.edits)this.write(e.field,e.before);this.redoStack.push(t);}
  redo(){const t=this.redoStack.pop();if(!t)return;for(const e of t.edits)this.write(e.field,e.after);this.undoStack.push(t);}
  download(){const text=JSON.stringify(validate(this.archive),null,2);if(new TextEncoder().encode(text).length>MAX_BYTES)fail('tooLarge');return text;}
}
export function tsv(text) {
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {const ch=text[i];
    if(ch==='"'&&(quoted||cell==='')) {if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&(ch==='\t'||ch==='\n'||ch==='\r')){row.push(cell);cell='';if(ch!=='\t'){rows.push(row);row=[];if(ch==='\r'&&text[i+1]==='\n')i++;}}
    else cell+=ch;
  }
  if(quoted)fail('invalidPaste');if(cell!==''||row.length){row.push(cell);rows.push(row);}
  if(!rows.length||rows.some(r=>r.length!==rows[0].length))fail('invalidPaste');return rows;
}
export function pasteEntries(rows,field,clear=false) {
  need(validField(field)); if(!['preset','scene','stomp'].includes(field.kind))fail('invalidPaste');const entries=[];
  for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){
    let f;
    if(field.kind==='preset'){const row=Math.floor((field.preset-1)/4)+r,col=(field.preset-1)%4+c;if(row>63||col>3)fail('pasteBounds');f={kind:'preset',setlist:field.setlist,preset:row*4+col+1};}
    else {const col=(field.kind==='stomp'?1:0)+c;if(field.index+r>7||col>1)fail('pasteBounds');f={...field,kind:col===0?'scene':'stomp',index:field.index+r};}
    const value=clean(rows[r][c]);if(value&&count(value)>limit(f))fail('tooLong');if(value!==null||clear)entries.push({field:f,value:value??''});
  }return entries;
}
