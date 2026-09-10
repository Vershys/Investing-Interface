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
 const adapter=new CodexAdapter({cwd:tmpdir(),codexHome,spawnProcess:(binary,args,options)=>{spawned={binary,args,options};return proc;}});try{const result=await adapter.run({prompt:'test',schema:{type:'object'}});assert.equal(result.text,'{"ok":true}');assert.equal(spawned.options.env.CODEX_HOME,codexHome);assert.deepEqual(sent.slice(0,2).map(m=>m.method),['initialize','initialized']);assert.equal(sent.find(m=>m.method==='initialize').params.capabilities.experimentalApi,true);assert.equal(sent.find(m=>m.method==='thread/start').params.permissions,':read-only');assert.equal(sent.find(m=>m.method==='turn/start').params.sandboxPolicy,undefined);assert.equal(sent.find(m=>m.method==='turn/start').params.outputSchema.type,'object');complete=false;const controller=new AbortController();const pending=adapter.run({prompt:'cancel',signal:controller.signal});setTimeout(()=>controller.abort(),10);await assert.rejects(pending,/cancelled/);assert(sent.some(m=>m.method==='turn/interrupt'));}finally{adapter.close();rmSync(codexHome,{recursive:true,force:true});}
});
