import {DatabaseSync} from 'node:sqlite';
export function sqliteAdapter(file){const sql=new DatabaseSync(file);sql.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, role TEXT NOT NULL, epoch INTEGER NOT NULL, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS rates (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);return {
 async readStateMeta(){return sql.prepare("SELECT revision,json_extract(value,'$.version') AS version,json_extract(value,'$.auth.team.epoch') AS teamEpoch,json_extract(value,'$.auth.editor.epoch') AS editorEpoch FROM state WHERE id=1").get()||null;},
 async readState(){const r=sql.prepare('SELECT revision,value FROM state WHERE id=1').get();return r?{revision:r.revision,value:JSON.parse(r.value)}:null;},
 async createState(v){return sql.prepare('INSERT OR IGNORE INTO state VALUES(1,1,?)').run(JSON.stringify(v)).changes===1;},
 async saveState(revision,v){return sql.prepare('UPDATE state SET revision=revision+1,value=? WHERE id=1 AND revision=?').run(JSON.stringify(v),revision).changes===1;},
 async addSession(token,s){sql.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());sql.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(token,s.role,s.epoch,s.expires);},
 async getSession(token){return sql.prepare('SELECT role,epoch,expires FROM sessions WHERE token=?').get(token)||null;},
 async deleteSession(token){sql.prepare('DELETE FROM sessions WHERE token=?').run(token);},
 async consumeRate(key,max,expires){sql.prepare('DELETE FROM rates WHERE expires < ?').run(Date.now());const r=sql.prepare('INSERT INTO rates VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').get(key,expires);return r.count<=max;},close(){sql.close();}
 };}
