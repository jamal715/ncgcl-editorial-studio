import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {sqliteAdapter} from './sqlite.mjs';
import {createHandler} from './core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=process.env.STUDIO_DATA_DIR||path.join(root,'.data');await fs.mkdir(path.join(data,'uploads'),{recursive:true});
let setupToken=process.env.SETUP_TOKEN;if(!setupToken){try{setupToken=(await fs.readFile(path.join(data,'setup-key'),'utf8')).trim();}catch{console.error('Run npm run setup:local before starting the local studio.');process.exit(1);}}
const db=sqliteAdapter(path.join(data,'studio.sqlite'));const storage={async put(key,bytes){await fs.writeFile(path.join(data,'uploads',key),bytes);return '/uploaded/'+key;}};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf'};
async function serveStatic(request){let p=decodeURIComponent(new URL(request.url).pathname);if(p==='/')p='/index.html';const dir=p.startsWith('/uploaded/')?path.join(data,'uploads'):path.join(root,'public');const relative=p.startsWith('/uploaded/')?p.slice(10):p.slice(1);const file=path.resolve(dir,relative);if(!file.startsWith(dir+path.sep))return new Response('Not found',{status:404});try{const bytes=await fs.readFile(file);return new Response(bytes,{headers:{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':p.startsWith('/uploaded/')?'public,max-age=31536000,immutable':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"}});}catch{return new Response('Not found',{status:404});}}
const handle=createHandler({db,storage,setupToken,serveStatic});const server=http.createServer(async(req,res)=>{try{const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});const out=await handle(request);res.writeHead(out.status,Object.fromEntries(out.headers));if(out.body)Readable.fromWeb(out.body).pipe(res);else res.end();}catch{res.writeHead(500);res.end('Unable to serve request.');}});const port=Number(process.env.PORT||4173);server.listen(port,'0.0.0.0',()=>console.log(`NCGCL Editorial Studio is running on port ${port}.`));
process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));
