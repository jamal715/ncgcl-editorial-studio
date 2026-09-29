import {seed} from './seed.mjs';
import {makeBlock,assetsFor,assetTargets,mergeAssets,upgradeConfig,ASSET_KINDS} from '../public/prompt.js';
const encoder=new TextEncoder();
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}});
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
export async function hashPassword(password,salt=random()){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256);return {salt,hash:Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('')};}
export async function checkPassword(password,record){if(typeof password!=='string'||password.length>200||!record)return false;const candidate=await hashPassword(password,record.salt);let difference=0;for(let i=0;i<candidate.hash.length;i++)difference|=candidate.hash.charCodeAt(i)^record.hash.charCodeAt(i);return difference===0;}
function passwordCheck(p){if(typeof p!=='string'||p.length<12||p.length>200)fail('Use a password between 12 and 200 characters.');}
const configKeys=['organisation','headingFont','bodyFont','fontRules','logoRules','pageRules','textRules','exhibitRules','headerText','footerText','footerRules','extra'];
const guideKeys=['howTo','fileRules','templateRules','finalCheck','staffSteps','helpNote'];
const ID=/^[-a-z0-9]{1,80}$/;const HEX=/^#[a-fA-F0-9]{6}$/;
const text=(v,max,label)=>{if(typeof v!=='string'||v.length>max)fail(`Check ${label}.`);return v.trim();};
export function validateConfig(input){
 if(!input||typeof input!=='object'||JSON.stringify(input).length>200000)fail('The standards are missing or too long.');
 const c=upgradeConfig(input);const clean={};
 for(const key of configKeys)clean[key]=text(c[key],12000,key);
 for(const key of ['organisation','headingFont','bodyFont','logoRules','pageRules','footerRules'])if(!clean[key])fail(`${key} cannot be empty.`);
 if(!Array.isArray(c.palette)||!c.palette.length||c.palette.length>24)fail('Keep between 1 and 24 brand colours.');
 const colourIds=new Set();clean.palette=c.palette.map(p=>{if(!p||!ID.test(p.id)||colourIds.has(p.id))fail('Each colour needs a unique ID.');colourIds.add(p.id);const name=text(p.name,200,'colour names');if(!name)fail('Give every colour a name.');const hex=text(p.hex,7,'colour codes');if(!HEX.test(hex))fail(`Enter ${name} as a six-digit hex code, such as #035076.`);return {id:p.id,name,hex:hex.toUpperCase(),use:text(p.use||'',2000,'colour usage')};});
 if(!Array.isArray(c.formats)||!c.formats.length||c.formats.length>12)fail('Keep between 1 and 12 output formats.');
 const formatIds=new Set();clean.formats=c.formats.map(f=>{if(!f||typeof f.id!=='string'||!/^[\w .()-]{1,80}$/.test(f.id)||formatIds.has(f.id))fail('Each output format needs a unique ID.');formatIds.add(f.id);const name=text(f.name,120,'format names');if(!name)fail('Give every output format a name.');return {id:f.id,name,rules:text(f.rules||'',12000,'format instructions')};});
 if(!Array.isArray(c.labels)||c.labels.length>20)fail('Keep up to 20 confidentiality labels.');
 clean.labels=[...new Set(c.labels.map(l=>text(l,80,'confidentiality labels')).filter(Boolean))];
 clean.guide=Object.fromEntries(guideKeys.map(k=>[k,text(c.guide[k]??'',12000,'prompt wording')]));
 if(!Array.isArray(c.types)||!c.types.length||c.types.length>40)fail('Keep between 1 and 40 document types.');
 const ids=new Set();clean.types=c.types.map(t=>{if(!t||!ID.test(t.id)||ids.has(t.id))fail('Each document type needs a unique ID.');ids.add(t.id);const name=text(t.name,200,'document type names'),rules=text(t.rules,12000,'design instructions');if(!name||!rules)fail('Give every document type a name and design instructions.');if(typeof t.active!=='boolean'||!Array.isArray(t.formats)||!t.formats.length||t.formats.some(f=>!formatIds.has(f)))fail(`Choose at least one output format for ${name}.`);return {id:t.id,name,description:text(t.description||'',2000,'descriptions'),rules,active:t.active,formats:[...new Set(t.formats)]};});
 if(!clean.types.some(t=>t.active))fail('Keep at least one document type available.');
 if(!Array.isArray(c.assets)||c.assets.length>80)fail('Keep up to 80 files.');
 const assetIds=new Set();clean.assets=c.assets.map(a=>{for(const k of ['id','name','kind','url','usage'])if(typeof a?.[k]!=='string'||a[k].length>4000)fail('Check the file details.');if(!ID.test(a.id)||assetIds.has(a.id)||!a.name.trim())fail('Each file needs a name and unique ID.');assetIds.add(a.id);const t=assetTargets(a);if(t.scopes.length>40||t.scopes.some(x=>!ids.has(x)))fail(`${a.name} refers to a document type that no longer exists.`);if(t.formats.some(f=>!formatIds.has(f)))fail(`${a.name} refers to an output format that no longer exists.`);if(!ASSET_KINDS.includes(a.kind))fail('Choose a supported file role.');if(!/^https:\/\/[^\s]+$/.test(a.url)&&!/^\/(assets|uploaded)\/[a-zA-Z0-9_.-]+$/.test(a.url))fail(`Use a public HTTPS download link or an uploaded file for ${a.name}.`);if(a.url.startsWith('https:')){const u=new URL(a.url);if(u.username||u.password||u.hash)fail('File links cannot contain credentials or fragments.');}return {...Object.fromEntries(['id','name','kind','url','usage'].map(k=>[k,a[k].trim()])),scopes:[...new Set(t.scopes)],formats:[...new Set(t.formats)],attach:t.attach};});
 mergeAssets(clean);return clean;
}
function view(row,role){const s=row.value;return {role,revision:row.revision,version:s.version,publishedAt:s.publishedAt,config:upgradeConfig(s.live),...(role==='editor'?{draft:upgradeConfig(s.draft),history:s.history.map(({config,...h})=>h)}:{})};}
function cookie(request,value,maxAge=28800){return `ncgcl_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
async function readJSON(request,limit=240000){const text=await request.text();if(text.length>limit)fail('This request is too large.',413);try{return JSON.parse(text);}catch{fail('Invalid request.');}}
async function session(request,db,row){const value=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ncgcl_session='))?.slice(14);if(!value||!/^[a-f0-9]{64}$/.test(value))return null;const s=await db.getSession(await digest(value));if(!s||s.expires<Date.now()||s.epoch!==row?.value.auth?.[s.role]?.epoch)return null;return s;}
const SESSION_SECONDS={team:7*24*3600,editor:8*3600};
async function startSession(request,db,state,role){const token=random();await db.addSession(await digest(token),{role,epoch:state.auth[role].epoch,expires:Date.now()+SESSION_SECONDS[role]*1000});return cookie(request,token,SESSION_SECONDS[role]);}
async function limit(request,db,action,max=12){const ip=request.headers.get('cf-connecting-ip')||'local';const bucket=Math.floor(Date.now()/900000);const key=await digest(`${ip}:${action}:${bucket}`);if(!await db.consumeRate(key,max,Date.now()+900000))fail('Too many attempts. Please try again in 15 minutes.',429);}
export function createHandler({db,storage,setupToken,serveStatic}){const createPassword=db.hashPassword||hashPassword;const verifyPassword=db.checkPassword||checkPassword;return async function handle(request){const url=new URL(request.url);const p=url.pathname;try{
 if(!p.startsWith('/api/'))return await serveStatic(request);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&request.headers.get('origin')!==url.origin)fail('Please make changes from this studio.',403);
 if(p==='/api/changes'&&request.method==='GET'){
 const meta=await db.readStateMeta();const identity=meta?{value:{auth:{team:{epoch:meta.teamEpoch},editor:{epoch:meta.editorEpoch}}}}:null;
 const viewer=await session(request,db,identity);if(!viewer)fail('Please enter the studio password to continue.',401);
 return json({version:meta.version,revision:meta.revision});
 }
 let row=await db.readState();let user=await session(request,db,row);
 if(p==='/api/status'&&request.method==='GET')return json({needsSetup:!row,role:user?.role||null});
 if(p==='/api/setup'&&request.method==='POST'){
 await limit(request,db,'setup',6);if(row)fail('The studio is already set up.',409);const b=await readJSON(request,2000);if(!setupToken||setupToken.length<32||typeof b.token!=='string'||await digest(b.token)!==await digest(setupToken))fail('The setup key is not valid.',403);passwordCheck(b.editorPassword);passwordCheck(b.teamPassword);if(b.editorPassword===b.teamPassword)fail('Choose different team and editor passwords.');
 const [editor,team]=await Promise.all([createPassword(b.editorPassword),createPassword(b.teamPassword)]);const now=new Date().toISOString();const initial=validateConfig(seed);const value={live:initial,draft:initial,version:1,publishedAt:now,history:[{version:1,date:now,note:'Initial NCGCL brand standards',config:initial}],auth:{editor:{...editor,epoch:1},team:{...team,epoch:1}}};
 if(!await db.createState(value))fail('Setup has already been completed.',409);return json({ok:true},200,{'Set-Cookie':await startSession(request,db,value,'editor')});
 }
 if(p==='/api/login'&&request.method==='POST'){
 await limit(request,db,'login',60);const b=await readJSON(request,1000);if(!row)fail('The studio owner needs to complete setup first.',409);if(!['team','editor'].includes(b.role)||!await verifyPassword(b.password,row.value.auth[b.role]))fail('The password was not recognised.',401);return json({ok:true},200,{'Set-Cookie':await startSession(request,db,row.value,b.role)});
 }
 if(p==='/api/logout'&&request.method==='POST'){const value=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ncgcl_session='))?.slice(14);if(value)await db.deleteSession(await digest(value));return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});}
 if(!user||!row)fail('Please enter the studio password to continue.',401);
 if(p==='/api/standards'&&request.method==='GET')return json(view(row,user.role));
 if(p==='/api/block'&&request.method==='POST'){
 const b=await readJSON(request,10000);const live=upgradeConfig(row.value.live);const t=live.types.find(t=>t.id===b.type&&t.active);if(!t)fail('That document type is no longer available. Refresh the list.');const details={};for(const k of ['title','author','date','classification','format']){if(b.details?.[k]!==undefined&&typeof b.details[k]!=='string')fail('Check the optional details.');details[k]=(b.details?.[k]||'').slice(0,1500);}if(details.format&&!t.formats.includes(details.format))fail('Choose an available output format.');const format=details.format||t.formats[0];return json({text:makeBlock(live,t.id,details,row.value.version,url.origin),version:row.value.version,publishedAt:row.value.publishedAt,assets:assetsFor(live,t.id,format)});
 }
 if(p==='/api/download'&&request.method==='GET'){
 const a=upgradeConfig(row.value.live).assets.find(a=>a.id===url.searchParams.get('asset'));if(!a)fail('That file is no longer published. Refresh the page.',404);
 const source=new URL(a.url,url.origin);const src=a.url.startsWith('/')?await serveStatic(new Request(source)):await fetch(source,{signal:AbortSignal.timeout(30000)});
 if(!src.ok||!src.body)fail('The file could not be retrieved. Ask the editor to check its link.',502);
 const ext=(source.pathname.match(/\.([a-z0-9]{2,5})$/i)||[])[1]?.toLowerCase()||'';const base=a.name.replace(/[^A-Za-z0-9 ._-]+/g,'').trim().replace(/\s+/g,'-')||'ncgcl-file';
 const name=ext&&!base.toLowerCase().endsWith('.'+ext)?`${base}.${ext}`:base;
 return new Response(src.body,{headers:{'Content-Type':src.headers.get('content-type')||'application/octet-stream','Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(user.role!=='editor')fail('The editor password is required to make changes.',403);
 if(p==='/api/validate'&&request.method==='POST')return json({config:validateConfig((await readJSON(request)).config)});
 if(p==='/api/export'&&request.method==='GET'){const {auth,...value}=row.value;return json({schemaVersion:1,exportedAt:new Date().toISOString(),...value});}
 if(p==='/api/assets'&&request.method==='POST'){
 await limit(request,db,'upload',30);if(Number(request.headers.get('content-length'))>21*1024*1024)fail('Use a file smaller than 20 MB.',413);const form=await request.formData();const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function'||file.size>20*1024*1024||file.size===0)fail('Choose a file between 1 byte and 20 MB.');const ext=file.name.split('.').pop().toLowerCase();const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf'};if(!types[ext])fail('Use PNG, JPEG, WebP, PDF, DOCX, PPTX or a font file.');const bytes=new Uint8Array(await file.arrayBuffer());const signature=Array.from(bytes.slice(0,12));const ascii=new TextDecoder().decode(bytes.slice(0,12));const valid=ext==='png'?signature.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':['jpg','jpeg'].includes(ext)?signature[0]===255&&signature[1]===216:ext==='webp'?ascii.startsWith('RIFF')&&ascii.slice(8)==='WEBP':ext==='pdf'?ascii.startsWith('%PDF-'):['docx','pptx'].includes(ext)?ascii.startsWith('PK'):ext==='woff'?ascii.startsWith('wOFF'):ext==='woff2'?ascii.startsWith('wOF2'):ext==='otf'?ascii.startsWith('OTTO'):signature.slice(0,4).join(',')==='0,1,0,0';if(!valid)fail('The file contents do not match its extension.');const key=`${crypto.randomUUID()}.${ext}`;const assetUrl=await storage.put(key,bytes,types[ext]);return json({url:assetUrl,name:file.name,size:file.size});
 }
 if(p==='/api/passwords'&&request.method==='POST'){
 const b=await readJSON(request,1500);await limit(request,db,'password-change',6);if(!await verifyPassword(b.currentPassword,row.value.auth.editor))fail('The current editor password was not recognised.',403);if(!['team','editor'].includes(b.role))fail('Choose team or editor.');passwordCheck(b.password);const other=b.role==='team'?'editor':'team';if(await verifyPassword(b.password,row.value.auth[other]))fail('Team and editor passwords must differ.');row.value.auth[b.role]={...await createPassword(b.password),epoch:row.value.auth[b.role].epoch+1};if(!await db.saveState(row.revision,row.value))fail('Settings changed in another session. Please retry.',409);return json({ok:true,signOut:b.role==='editor'},200,b.role==='editor'?{'Set-Cookie':cookie(request,'',0)}:{});
 }
 if(p==='/api/standards'&&request.method==='POST'){
 const b=await readJSON(request);if(b.revision!==row.revision)fail('Another session saved changes. Your edits are preserved; reload the saved draft before saving.',409);
 if(b.action==='save'||b.action==='publish')row.value.draft=validateConfig(b.config);
 else if(b.action==='restore'){const h=row.value.history.find(h=>h.version===b.version);if(!h)fail('That version is no longer retained.');row.value.draft=h.config;}
 else fail('Choose a valid action.');
 if(b.action==='publish'){if(typeof b.note!=='string'||!b.note.trim()||b.note.length>300)fail('Add a short change note.');row.value.version++;row.value.live=row.value.draft;row.value.publishedAt=new Date().toISOString();row.value.history=[{version:row.value.version,date:row.value.publishedAt,note:b.note.trim(),config:row.value.live},...row.value.history].slice(0,12);}
 if(!await db.saveState(row.revision,row.value))fail('Another session saved changes first. Reload the draft before saving.',409);return json(view({revision:row.revision+1,value:row.value},user.role));
 }
 return json({error:'Not found.'},404);
 }catch(e){if(!e.status)console.error('Studio request failed:',e.message);return json({error:e.status?e.message:'The studio could not complete this request. Your entries have been preserved; please retry.'},e.status||503);}
 };}
