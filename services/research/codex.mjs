import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {EventEmitter} from 'node:events';
import {mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';

// Adapter boundary: all App Server protocol details stay outside the UI/controller.
export class CodexAdapter extends EventEmitter {
  constructor({cwd,binary=process.env.BASTION_CODEX_BIN||'codex',codexHome=process.env.BASTION_CODEX_HOME||join(homedir(),'.bastion','codex'),spawnProcess=spawn}={}){super();this.cwd=cwd;this.binary=binary;this.codexHome=codexHome;this.spawnProcess=spawnProcess;this.pending=new Map();this.seq=0;this.proc=null;this.ready=null;}
  async start(){
    if(this.ready)return this.ready;
    this.ready=this.initialize().catch(e=>{this.ready=null;throw e;});return this.ready;
  }
  async initialize(){
    // Use a Bastion-owned Codex home so an unrelated or older user-level MCP
    // configuration cannot prevent the research app-server from starting.
    // Authentication remains persistent, but is intentionally scoped to Bastion.
    mkdirSync(this.codexHome,{recursive:true,mode:0o700});
    const p=this.spawnProcess(this.binary,['app-server'],{cwd:this.cwd,env:{...process.env,CODEX_HOME:this.codexHome},stdio:['pipe','pipe','pipe']});this.proc=p;
    const fail=e=>{for(const x of this.pending.values()){clearTimeout(x.timer);x.reject(e);}this.pending.clear();this.ready=null;this.proc=null;this.emit('disconnect',e);};
    p.on('error',()=>fail(new Error('Codex could not start. Install the Codex CLI and make it available on PATH, then reconnect.')));
    p.on('exit',()=>fail(new Error('Codex stopped. Reconnect to continue.')));
    p.stderr.on('data',()=>{}); // Never forward credential-bearing diagnostics to the browser.
    p.stdin.on('error',()=>{});
    const lines=createInterface({input:p.stdout});
    lines.on('line',line=>{
      let m;try{m=JSON.parse(line);}catch{return;}
      if(m.id!==undefined&&m.method){
        // Research does not grant runtime requests to execute commands, mutate files or use other connectors.
        this.send({id:m.id,error:{code:-32601,message:'Bastion research does not authorize this operation'}});return;
      }
      if(m.id!==undefined){const x=this.pending.get(m.id);if(x){clearTimeout(x.timer);this.pending.delete(m.id);m.error?x.reject(new Error(m.error.message||'Codex request failed')):x.resolve(m.result);}}
      else if(m.method)this.emit('notification',m);
    });
    await this.rpc('initialize',{clientInfo:{name:'bastion_research',title:'Bastion Research',version:'0.1.0'},capabilities:{experimentalApi:true}});
    this.send({method:'initialized',params:{}});
  }
  send(m){if(!this.proc?.stdin.writable)throw new Error('Codex is disconnected');this.proc.stdin.write(JSON.stringify(m)+'\n');}
  rpc(method,params={}){return new Promise((resolve,reject)=>{const id=++this.seq;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`Codex request timed out: ${method}`));},30000);this.pending.set(id,{resolve,reject,timer});try{this.send({id,method,params});}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}});}
  async account(){await this.start();const r=await this.rpc('account/read',{refreshToken:false});return {connected:r.account?.type==='chatgpt',type:r.account?.type||null,email:r.account?.email||null};}
  async login(){await this.start();return this.rpc('account/login/start',{type:'chatgpt',useHostedLoginSuccessPage:true,appBrand:'chatgpt'});}
  async run({prompt,schema,onProgress=()=>{},onThread=()=>{},onEvent=()=>{},signal}){
    await this.start();if(signal?.aborted)throw new Error('Research cancelled');
    const current=await this.rpc('config/read',{includeLayers:false});
    const config={web_search:'live','features.shell_tool':false,'features.unified_exec':false,'apps._default.enabled':false};
    for(const name of Object.keys(current.config?.mcp_servers||{}))config[`mcp_servers.${JSON.stringify(name)}.enabled`]=false;
    for(const name of Object.keys(current.config?.apps||{}))config[`apps.${JSON.stringify(name)}.enabled`]=false;
    const {thread}=await this.rpc('thread/start',{cwd:this.cwd,approvalPolicy:'untrusted',permissions:':read-only',ephemeral:true,config});
    onThread(thread.id);
    return new Promise((resolve,reject)=>{
      let finalText='',turnId=null,settled=false;
      const timer=setTimeout(()=>finish(new Error('Research exceeded 20 minutes. The run was stopped; no automatic retry was made.')),20*60*1000);
      const cleanup=()=>{clearTimeout(timer);this.off('notification',listener);this.off('disconnect',disconnected);signal?.removeEventListener('abort',aborted);};
      const stop=()=>{if(turnId)this.rpc('turn/interrupt',{threadId:thread.id,turnId}).catch(()=>{});};
      const finish=(error)=>{if(settled)return;settled=true;cleanup();if(error){stop();reject(error);}else if(!finalText.trim())reject(new Error('Codex completed without a report'));else resolve({text:finalText,threadId:thread.id,turnId});};
      const disconnected=e=>finish(e);
      const aborted=()=>finish(new Error('Research cancelled'));
      const listener=m=>{
        const p=m.params||{};if(p.threadId!==thread.id&&!(turnId&&p.turnId===turnId&&!p.threadId))return;
        onEvent(m);
        if(m.method==='item/started')onProgress(p.item?.type==='webSearch'?'Searching sources':'Analyzing company');
        if(m.method==='item/completed'&&p.item?.type==='agentMessage'&&p.item.phase!=='commentary')finalText=p.item.text||finalText;
        if(m.method==='turn/completed'){
          const t=p.turn;if(t?.status!=='completed')finish(new Error(t?.error?.message||`Research ${t?.status||'failed'}`));else finish();
        }
      };
      this.on('notification',listener);this.on('disconnect',disconnected);signal?.addEventListener('abort',aborted,{once:true});
      this.rpc('turn/start',{threadId:thread.id,input:[{type:'text',text:prompt}],approvalPolicy:'untrusted',...(schema?{outputSchema:schema}:{})}).then(r=>{turnId=r.turn.id;if(signal?.aborted||settled)stop();}).catch(finish);
    });
  }
  close(){this.proc?.kill();}
}
