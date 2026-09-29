import {randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
await fs.mkdir('.data',{recursive:true});try{await fs.writeFile('.data/setup-key',randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
console.log('Local setup key saved in .data/setup-key. Run npm start, open http://localhost:4173, and enter that key to choose your team and editor passwords. Do not commit or share the key.');
