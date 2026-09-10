import {createServer} from 'node:http';
import {mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {recordActivity} from './activity.mjs';
import {ReportStore} from './store.mjs';
import {CodexAdapter} from './codex.mjs';
import {reportSchema,validateReport,validateGeneratedReport} from '../../lib/research/schema.mjs';
import {researchPrompt,followupPrompt,PROMPT_VERSION} from './prompt.mjs';

export function createResearchService({directory=process.env.BASTION_RESEARCH_DATA||join(homedir(),'.bastion','research'),adapter,port=4319,origin='http://127.0.0.1:4317'}={}){
  const store=new ReportStore(join(directory,'runs'));
  const cwd=join(directory,'runtime');mkdirSync(cwd,{recursive:true,mode:0o700});
  const codex=adapter||new CodexAdapter({cwd});const active=new Map();let account={connected:false,type:null,email:null};let login=null;
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  const slim=r=>{const {report,answer,activity,rawResponse,...rest}=r;return {...rest,companyName:report?.company.name,hasReport:!!report,hasAnswer:!!answer,canRecover:!!rawResponse};};
  async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4*1024*1024)throw new Error('Request exceeds 4 MB');}return JSON.parse(raw||'{}');}
  async function execute(run,previous){
    const abort=new AbortController();active.set(run.id,abort);
    let lastStage='',activitySave=null;
    const flushActivity=()=>{if(activitySave){clearTimeout(activitySave);activitySave=null;}store.put(run);};
    const update=patch=>{Object.assign(run,patch);flushActivity();};
    try{
      update({status:'running',stage:'Resolving issuer and gathering evidence'});
      const result=await codex.run({prompt:run.parentRunId?followupPrompt(run.question,previous):researchPrompt({ticker:run.ticker,question:run.question,previous,mode:run.mode}),model:run.model,effort:run.effort,schema:run.parentRunId?undefined:reportSchema,signal:abort.signal,onThread:threadId=>update({threadId}),onEvent:event=>{recordActivity(run,event);if(!activitySave)activitySave=setTimeout(()=>{activitySave=null;store.put(run);},500);},onProgress:stage=>{if(stage!==lastStage){lastStage=stage;update({stage});}}});
      if(abort.signal.aborted)throw new Error('Research cancelled');
      if(run.parentRunId)update({answer:result.text,status:'completed',stage:'Answer saved',completedAt:new Date().toISOString()});
      else{
        update({stage:'Checking report structure and evidence references'});
        update({rawResponse:result.text});
        const {report,warnings}=validateGeneratedReport(JSON.parse(result.text));
        const requested=run.ticker.split(':').at(-1);
        if(report.company.ticker.toUpperCase()!==requested)throw new Error('Reported ticker differs from requested issuer. Specify the exchange and retry.');
        if(run.ticker.includes(':')&&report.company.exchange.toUpperCase()!==run.ticker.split(':')[0])throw new Error('Reported exchange differs from the requested exchange. Verify the issuer.');
        update({report,warnings,status:'completed',stage:'Report saved',completedAt:new Date().toISOString()});
      }
    }catch(e){update({status:abort.signal.aborted?'interrupted':'failed',stage:'Stopped',error:e.message,completedAt:new Date().toISOString()});}
    finally{flushActivity();active.delete(run.id);}
  }
  const server=createServer(async(req,res)=>{
    try{
      // No CORS. Explicit host, origin and custom header reject foreign browser requests and DNS rebinding.
      if(req.headers.host!==`127.0.0.1:${port}`||req.headers['x-bastion-client']!=='research-v1'||(req.headers.origin&&req.headers.origin!==origin))return json(res,403,{error:'Use the local Bastion application to access research.'});
      if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
      if(req.method==='POST'&&req.headers.origin!==origin)return json(res,403,{error:'A same-origin request is required.'});
      const path=new URL(req.url,`http://127.0.0.1:${port}`).pathname;
      if(req.method==='GET'&&path==='/research-api/status')return json(res,200,{service:'bastion-research',version:'0.1.0',account,login,activeRuns:[...active.keys()]});
      if(req.method==='GET'&&path==='/research-api/models')return json(res,200,{models:await codex.models()});
      if(req.method==='POST'&&path==='/research-api/connect'){
        account=await codex.account();if(account.connected)login=null;return json(res,200,{account});
      }
      if(req.method==='POST'&&path==='/research-api/login'){
        if(login?.authUrl)return json(res,200,login);
        const result=await codex.login();const url=new URL(result.authUrl);
        if(url.protocol!=='https:'||!['chatgpt.com','auth.openai.com','auth0.openai.com'].includes(url.hostname))throw new Error('Codex returned an unexpected sign-in URL');
        login={authUrl:result.authUrl,loginId:result.loginId};return json(res,200,login);
      }
      if(req.method==='GET'&&path==='/research-api/runs')return json(res,200,{runs:store.list().map(slim)});
      const recover=path.match(/^\/research-api\/runs\/([a-f0-9-]{36})\/recover$/);
      if(req.method==='POST'&&recover){
        const run=store.get(recover[1]);
        if(!run?.rawResponse)return json(res,404,{error:'No saved response is available for recovery.'});
        if(active.has(run.id))return json(res,409,{error:'Wait for this run to end before recovery.'});
        const {report,warnings}=validateGeneratedReport(JSON.parse(run.rawResponse));
        if(report.company.ticker.toUpperCase()!==run.ticker.split(':').at(-1))throw new Error('Reported ticker differs from requested issuer. Recovery stopped.');
        if(run.ticker.includes(':')&&report.company.exchange.toUpperCase()!==run.ticker.split(':')[0])throw new Error('Reported exchange differs from requested exchange. Verify the issuer before starting a corrected request.');
        const saved=store.put({...run,report,warnings,status:'completed',stage:'Saved response recovered without a model call',error:undefined,completedAt:new Date().toISOString()});
        return json(res,200,saved);
      }
      const match=path.match(/^\/research-api\/runs\/([a-f0-9-]{36})(\/cancel)?$/);
      if(match){const run=store.get(match[1]);if(!run)return json(res,404,{error:'Run not found'});if(req.method==='GET'&&!match[2])return json(res,200,run);if(req.method==='POST'&&match[2]){active.get(run.id)?.abort();return json(res,200,{cancelled:active.has(run.id)});}}
      if(req.method==='POST'&&path==='/research-api/runs'){
        const input=await body(req);
        if(typeof input.id!=='string'||! /^[a-f0-9-]{36}$/.test(input.id))return json(res,400,{error:'A request UUID is required'});
        const existing=store.get(input.id);if(existing)return json(res,200,slim(existing));
        if(active.size)return json(res,409,{error:'One research run is already active. Wait or cancel it first.'});
        const ticker=String(input.ticker||'').trim().toUpperCase();
        if(!/^(?:[A-Z0-9]{2,12}:)?[A-Z0-9][A-Z0-9.\-]{0,14}$/.test(ticker))return json(res,400,{error:'Enter a ticker, optionally prefixed by exchange, such as NYSE:ORN.'});
        const question=String(input.question||'').trim();if(question.length>6000)return json(res,400,{error:'Question exceeds 6,000 characters'});
        let previous=null;
        if(input.parentRunId){const parent=store.get(input.parentRunId);if(!parent?.report||parent.ticker!==ticker||!question)return json(res,400,{error:'Choose a saved company report and enter a question'});previous=parent.report;}
        else previous=store.list().find(r=>r.ticker===ticker&&r.report)?.report||null;
        if(!account.connected)return json(res,409,{error:'Connect your ChatGPT account before starting research.'});
        const mode=input.mode==='full'?'full':'quick';
        let model,effort;
        if(codex.models){const models=await codex.models();const selected=input.model?models.find(m=>m.model===input.model):models.find(m=>m.isDefault);if(input.model&&!selected)return json(res,400,{error:'Selected model is unavailable. Refresh the model list.'});model=selected?.model;if(mode==='quick'&&selected?.supportedReasoningEfforts?.some(e=>e.reasoningEffort==='low'))effort='low';}
        if(active.size)return json(res,409,{error:'A research run is already active.'});
        const run=store.put({id:input.id,ticker,question,mode,model,effort,...(input.parentRunId?{parentRunId:input.parentRunId}:{}),promptVersion:PROMPT_VERSION,createdAt:new Date().toISOString(),status:'queued',stage:'Queued'});
        void execute(run,previous);return json(res,202,slim(run));
      }
      if(req.method==='POST'&&path==='/research-api/import'){
        const {report}=validateReport(await body(req));
        const run=store.put({id:randomUUID(),ticker:`${report.company.exchange}:${report.company.ticker}`.toUpperCase(),question:'Imported report',createdAt:new Date().toISOString(),status:'completed',stage:'Imported; sources need review',report,warnings:validateReport(report).warnings});return json(res,201,run);
      }
      return json(res,404,{error:'Research route not found'});
    }catch(e){return json(res,400,{error:e.message||'Research request failed'});}
  });
  codex.on('notification',m=>{if(m.method==='account/login/completed'){login=m.params.success?null:{error:m.params.error||'Sign-in did not complete'};}if(m.method==='account/updated'||m.method==='account/login/completed')void codex.account().then(a=>{account=a;}).catch(()=>{account={connected:false,type:null,email:null};});});
  codex.on('disconnect',()=>{account={connected:false,type:null,email:null};login=null;});
  server.on('listening',()=>store.recover());
  server.on('close',()=>{for(const controller of active.values())controller.abort();codex.close();});
  return {server,store,codex};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const {server}=createResearchService();server.listen(4319,'127.0.0.1',()=>console.log('Bastion research service ready on loopback port 4319.'));server.on('error',e=>{console.error(e.message);process.exitCode=1;});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());}
