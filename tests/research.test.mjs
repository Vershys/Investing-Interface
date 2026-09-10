import {test} from 'node:test';
import {request as httpRequest} from 'node:http';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {EventEmitter,once} from 'node:events';
import {PassThrough} from 'node:stream';
import {validateReport} from '../lib/research/schema.mjs';
import {ReportStore} from '../services/research/store.mjs';
import {createResearchService} from '../services/research/server.mjs';
import {CodexAdapter} from '../services/research/codex.mjs';
const fixture=()=>({schemaVersion:'1.0',company:{ticker:'ORN',exchange:'NYSE',name:'Test issuer (fixture)',cik:null,businessModels:['contracting']},asOf:'2026-09-10',summary:'Test only',coverage:{status:'partial',searchedThrough:'2026-09-10',limitations:['Fixture; not financial research']},metrics:[],subsidiaries:[],revenueTypes:[],contracts:[],claims:[],terms:[],sources:[{id:'s1',title:'Fixture',url:'https://example.com/filing',publisher:'Fixture',publishedAt:null,accessedAt:'2026-09-10',sourceType:'filing'}]});
const metric=()=>({id:'revenue_2025',label:'Revenue',value:0,unit:'USD',period:'2025',periodType:'annual',scope:'consolidated',definition:'Reported revenue',kind:'reported',availability:'available',calculation:'',sourceIds:['s1'],locator:'Income statement'});
test('zero is valid; unknown cannot become zero; source references and URLs are checked',()=>{const r=fixture();r.metrics=[metric()];assert.equal(validateReport(r).report.metrics[0].value,0);r.metrics[0].availability='not_disclosed';assert.throws(()=>validateReport(r),/availability/);r.metrics[0].value=null;validateReport(r);r.metrics[0].sourceIds=['missing'];assert.throws(()=>validateReport(r),/unresolved/);r.metrics=[];r.sources[0].url='javascript:alert(1)';assert.throws(()=>validateReport(r),/Unsafe/);});
test('immutable run identity survives restart and incomplete work becomes interrupted',()=>{const dir=mkdtempSync(join(tmpdir(),'bastion-store-'));try{let store=new ReportStore(dir);const id=randomUUID();store.put({id,status:'running',createdAt:'2026-09-10'});store=new ReportStore(dir);store.recover();assert.equal(store.get(id).status,'interrupted');assert.throws(()=>store.get('../../etc/passwd'));}finally{rmSync(dir,{recursive:true,force:true});}});
test('HTTP boundary, idempotent runs, report save, follow-up and import validation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bastion-service-'));
 class Adapter extends EventEmitter{calls=0;async account(){return {connected:true,type:'chatgpt',email:null};}async run({schema}){this.calls++;return {text:schema?JSON.stringify(fixture()):'Saved evidence answer'};}close(){}}
 const adapter=new Adapter();const {server}=createResearchService({directory:dir,adapter,port:4319});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
 const request=(path,body,headers={})=>new Promise((resolve,reject)=>{const req=httpRequest(base+'/research-api'+path,{method:body===undefined?'GET':'POST',headers:{Host:'127.0.0.1:4319','X-Bastion-Client':'research-v1',Origin:'http://127.0.0.1:4317','Content-Type':'application/json',...headers}},res=>{let raw='';res.on('data',c=>raw+=c);res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(raw)}));});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));});
 try{
  assert.equal((await request('/status',undefined,{Origin:'https://evil.example'})).status,403);
  assert.equal((await request('/status',undefined,{Host:'evil.example'})).status,403);
  assert.equal((await request('/status',undefined,{'X-Bastion-Client':''})).status,403);
  await request('/connect',{});const id=randomUUID();const input={id,ticker:'NYSE:ORN',question:'Debt'};
  assert.equal((await request('/runs',input)).status,202);assert.equal((await request('/runs',input)).status,200);assert.equal(adapter.calls,1);
  const saved=await (await request('/runs/'+id)).json();assert.equal(saved.status,'completed');assert.equal(saved.report.company.ticker,'ORN');
  const followId=randomUUID();await request('/runs',{id:followId,ticker:'NYSE:ORN',parentRunId:id,question:'Why?'});const answer=await (await request('/runs/'+followId)).json();assert.equal(answer.answer,'Saved evidence answer');
  const invalid=fixture();invalid.metrics=[{...metric(),sourceIds:['missing']}];assert.equal((await request('/import',invalid)).status,400);
 }finally{server.close();await once(server,'close');rmSync(dir,{recursive:true,force:true});}
});
test('App Server handshake, structured output, final response and cancellation use the protocol',async()=>{
 const proc=new EventEmitter();proc.stdin=new PassThrough();proc.stdout=new PassThrough();proc.stderr=new PassThrough();proc.kill=()=>proc.emit('exit',0);const sent=[];let complete=true;
 proc.stdin.on('data',b=>{for(const line of b.toString().trim().split('\n')){const m=JSON.parse(line);sent.push(m);if(m.id===undefined)continue;let result={};if(['thread/start','turn/start'].includes(m.method)&&!['untrusted','on-request','never'].includes(m.params.approvalPolicy)){proc.stdout.write(JSON.stringify({id:m.id,error:{message:'Invalid approval policy variant'}})+'\n');continue;}if(m.method==='thread/start'&&m.params.permissions!==':read-only'){proc.stdout.write(JSON.stringify({id:m.id,error:{message:'Invalid permission profile'}})+'\n');continue;}if(m.method==='turn/start'&&m.params.sandboxPolicy?.access){proc.stdout.write(JSON.stringify({id:m.id,error:{message:'readOnly.access is no longer supported; use permissionProfile for restricted reads'}})+'\n');continue;}if(m.method==='thread/start')result={thread:{id:'thr_test'}};if(m.method==='turn/start')result={turn:{id:'turn_test'}};proc.stdout.write(JSON.stringify({id:m.id,result})+'\n');if(m.method==='turn/start'&&complete)queueMicrotask(()=>{proc.stdout.write(JSON.stringify({method:'item/completed',params:{threadId:'thr_test',item:{type:'agentMessage',text:'{"ok":true}'}}})+'\n');proc.stdout.write(JSON.stringify({method:'turn/completed',params:{threadId:'thr_test',turn:{status:'completed'}}})+'\n');});}});
 const codexHome=mkdtempSync(join(tmpdir(),'bastion-codex-home-'));let spawned;
 const adapter=new CodexAdapter({cwd:tmpdir(),codexHome,spawnProcess:(binary,args,options)=>{spawned={binary,args,options};return proc;}});try{const events=[];const result=await adapter.run({prompt:'test',model:'test-model',effort:'low',schema:{type:'object'},onEvent:e=>events.push(e)});assert(events.some(e=>e.method==='turn/completed'));assert.equal(result.text,'{"ok":true}');assert.equal(sent.find(m=>m.method==='turn/start').params.model,'test-model');assert.equal(sent.find(m=>m.method==='turn/start').params.effort,'low');assert.equal(spawned.options.env.CODEX_HOME,codexHome);assert.deepEqual(sent.slice(0,2).map(m=>m.method),['initialize','initialized']);assert.equal(sent.find(m=>m.method==='initialize').params.capabilities.experimentalApi,true);assert.equal(sent.find(m=>m.method==='thread/start').params.permissions,':read-only');assert.equal(sent.find(m=>m.method==='turn/start').params.sandboxPolicy,undefined);assert.equal(sent.find(m=>m.method==='turn/start').params.outputSchema.type,'object');complete=false;const controller=new AbortController();const pending=adapter.run({prompt:'cancel',signal:controller.signal});setTimeout(()=>controller.abort(),10);await assert.rejects(pending,/cancelled/);assert(sent.some(m=>m.method==='turn/interrupt'));}finally{adapter.close();rmSync(codexHome,{recursive:true,force:true});}
});

test('activity preserves source lifecycle and summaries without storing raw reasoning or final JSON',async()=>{
 const {recordActivity}=await import('../services/research/activity.mjs');
 const run={};const at='2026-09-10T12:00:00Z';
 const event=(method,params)=>recordActivity(run,{method,params},at);
 event('item/started',{item:{id:'s',type:'webSearch',action:{type:'search',query:'ORN backlog'}}});
 event('item/completed',{item:{id:'s',type:'webSearch',query:'ORN backlog'}});
 assert.equal(run.activity.length,1);assert.equal(run.activity[0].state,'completed');
 event('item/reasoning/summaryTextDelta',{itemId:'r',summaryIndex:0,delta:'Checking '});
 event('item/reasoning/summaryTextDelta',{itemId:'r',summaryIndex:0,delta:'debt definitions.'});
 assert.equal(run.activity[1].detail,'Checking debt definitions.');
 event('item/reasoning/textDelta',{itemId:'r',delta:'PRIVATE_RAW'});
 event('item/completed',{item:{type:'agentMessage',phase:'final_answer',text:'FINAL_JSON'}});
 assert(!JSON.stringify(run).includes('PRIVATE_RAW'));assert(!JSON.stringify(run).includes('FINAL_JSON'));
 assert.equal(run.lastResearchEventAt,at);
 for(let i=0;i<160;i++)event('item/started',{item:{id:`s${i}`,type:'webSearch',action:{type:'openPage',url:'javascript:alert(1)'}}});
 assert.equal(run.activity.length,150);assert.equal(run.activity.at(-1).url,undefined);
});

test('generated metric recovery excludes unsupported calculations; imports remain strict',async()=>{
 const {validateGeneratedReport}=await import('../lib/research/schema.mjs');
 const report=fixture();report.metrics=[metric(),{...metric(),id:'fcf',label:'Free cash flow',kind:'calculated',calculation:''}];
 assert.throws(()=>validateReport(report),/calculation/);
 const recovered=validateGeneratedReport(report).report;
 assert.equal(recovered.metrics.length,1);assert.equal(recovered.metrics[0].value,0);
 assert(recovered.coverage.limitations.some(s=>s.includes('Free cash flow')));
 assert.equal(report.metrics.length,2);
 report.sources[0].url='javascript:alert(1)';assert.throws(()=>validateGeneratedReport(report),/Unsafe/);
});
test('quick scope avoids historical report expansion and keeps full research optional',async()=>{
 const {researchPrompt}=await import('../services/research/prompt.mjs');
 const quick=researchPrompt({ticker:'ORN',previous:{company:{ticker:'ORN'},asOf:'2026-01-01',summary:'x',metrics:['HUGE_HISTORY']}});
 assert(quick.includes('at most 12'));assert(!quick.includes('HUGE_HISTORY'));
 assert(researchPrompt({ticker:'ORN',mode:'full'}).includes('at least 3 annual periods'));
});

test('overview facts are backward compatible and require safe, resolved evidence',()=>{
 const old=fixture();validateReport(old);
 const next={...fixture(),schemaVersion:'1.1',companyInfo:[{key:'ceo',value:'Fixture leader',sourceIds:['s1'],locator:'Leadership'}]};validateReport(next);
 next.companyInfo[0].sourceIds=[];assert.throws(()=>validateReport(next),/evidence/);
 next.companyInfo=[{key:'website',value:'javascript:bad',sourceIds:['s1'],locator:'Header'}];assert.throws(()=>validateReport(next),/Unsafe/);
});
test('financial visuals separate scales, scope and dates and preserve negative and zero values',async()=>{
 const {financialGroups,financialAxis}=await import('../lib/research/visuals.mjs');
 const rows=[metric(),{...metric(),id:'net_income_2025',label:'Net income',value:-10},{...metric(),id:'revenue_2024',period:'2024',value:50},{...metric(),id:'revenue_segment',scope:'segment',value:2},{...metric(),id:'revenue_millions',unit:'USD millions',value:2},{...metric(),id:'revenue_inferred',kind:'inferred',value:90},{...metric(),id:'revenue_missing',value:null}];
 const groups=financialGroups(rows);assert.equal(groups.length,4);assert.equal(groups[0].metrics.length,2);
 const axis=financialAxis(groups[0].metrics);assert.equal(axis.min,-10);assert.equal(axis.max,0);assert.equal(axis.zero,100);assert.equal(axis.position(-10),0);
 assert(Number.isFinite(financialAxis([metric()]).zero));
});
