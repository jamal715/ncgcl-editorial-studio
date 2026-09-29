import {createHandler} from './core.mjs';
import {supabaseAdapter} from './supabase.mjs';
export default {async fetch(request,env){try{const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);const {db,storage}=supabaseAdapter(env);return createHandler({db,storage,setupToken:env.SETUP_TOKEN,serveStatic:r=>env.ASSETS.fetch(r)})(request);}catch{ return Response.json({error:'The studio backend is not configured yet.'},{status:503,headers:{'Cache-Control':'no-store'}});}}};
