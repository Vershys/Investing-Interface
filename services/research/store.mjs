import {mkdirSync,readFileSync,writeFileSync,renameSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
export class ReportStore {
  constructor(directory){this.directory=directory;mkdirSync(directory,{recursive:true,mode:0o700});}
  path(id){if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid run ID');return join(this.directory,id+'.json');}
  get(id){try{return JSON.parse(readFileSync(this.path(id),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  put(run){const path=this.path(run.id),temp=path+'.'+randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify(run),{mode:0o600});renameSync(temp,path);return run;}
  list(){return readdirSync(this.directory).filter(f=>/^[a-f0-9-]{36}\.json$/.test(f)).map(f=>this.get(f.slice(0,-5))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
  recover(){for(const r of this.list())if(['running','queued'].includes(r.status))this.put({...r,status:'interrupted',stage:'Interrupted',error:'The local service stopped during this run. Review before starting a new run.'});}
}
