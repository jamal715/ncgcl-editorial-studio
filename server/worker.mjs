import {createHandler} from './core.mjs';
import {supabaseAdapter} from './supabase.mjs';
export default {async fetch(request,env){try{const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);const {db,storage}=supabaseAdapter(env);return createHandler({db,storage,setupToken:env.SETUP_TOKEN,serveStatic:r=>env.ASSETS.fetch(r)})(request);}catch{ return Response.json({error:'The studio backend is not configured yet.'},{status:503,headers:{'Cache-Control':'no-store'}});}},
// Scheduled keep-alive: touches the database so a free Supabase project is not paused for inactivity.
async scheduled(event,env,ctx){ctx.waitUntil((async()=>{try{const {db}=supabaseAdapter(env);await db.readStateMeta();await db.consumeRate('keep-alive',1000000,Date.now()+3600000);console.log('Supabase keep-alive succeeded.');}catch(e){console.error('Supabase keep-alive failed:',e.message);}})());}};
