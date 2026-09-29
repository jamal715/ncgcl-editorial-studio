export function supabaseAdapter(env){
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Supabase is not configured.');
 const origin=env.SUPABASE_URL.trim().replace(/\/$/,'');const key=env.SUPABASE_SERVICE_ROLE_KEY.trim();
 // Modern secret keys authenticate through apikey; only legacy JWTs use Bearer.
 const authHeaders={apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`})};
 const headers={...authHeaders,'Content-Type':'application/json'};
 async function rest(path,options={}){const r=await fetch(`${origin}/rest/v1/${path}`,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(`Storage service returned ${r.status}.`);const text=await r.text();return text?JSON.parse(text):null;}
 const db={
 async hashPassword(password){return {algorithm:'bcrypt-sha256',hash:await rest('rpc/ncgcl_studio_hash_password',{method:'POST',body:JSON.stringify({p_password:password})})};},
 async checkPassword(password,record){if(typeof password!=='string'||password.length>200||record?.algorithm!=='bcrypt-sha256')return false;return await rest('rpc/ncgcl_studio_check_password',{method:'POST',body:JSON.stringify({p_password:password,p_hash:record.hash})});},
 async readStateMeta(){const r=await rest('ncgcl_studio_state?id=eq.1&select=revision,version:value->version,teamEpoch:value->auth->team->epoch,editorEpoch:value->auth->editor->epoch');return r[0]||null;},
 async readState(){const r=await rest('ncgcl_studio_state?id=eq.1&select=revision,value');return r[0]||null;},
 async createState(value){const r=await rest('ncgcl_studio_state?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({id:1,revision:1,value})});return r.length===1;},
 async saveState(revision,value){const r=await rest(`ncgcl_studio_state?id=eq.1&revision=eq.${revision}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({revision:revision+1,value})});return r.length===1;},
 async addSession(token,s){await rest('ncgcl_studio_sessions',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({token,...s})});},
 async getSession(token){const r=await rest(`ncgcl_studio_sessions?token=eq.${token}&select=role,epoch,expires`);return r[0]||null;},
 async deleteSession(token){await rest(`ncgcl_studio_sessions?token=eq.${token}`,{method:'DELETE'});},
 async consumeRate(key,maximum,expires){return await rest('rpc/ncgcl_studio_take_rate',{method:'POST',body:JSON.stringify({p_key:key,p_maximum:maximum,p_expires:expires})});}
 };
 const storage={async put(key,bytes,type){const r=await fetch(`${origin}/storage/v1/object/ncgcl-studio-assets/${key}`,{method:'POST',headers:{...authHeaders,'Content-Type':type,'Cache-Control':'31536000','x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`Asset storage returned ${r.status}.`);return `${origin}/storage/v1/object/public/ncgcl-studio-assets/${key}`;}};
 return {db,storage};
}
