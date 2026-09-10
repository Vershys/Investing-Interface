// Persist only user-facing, allowlisted telemetry. Never retain raw reasoning,
// command output, credentials, tool arguments, or the in-progress report JSON.
const clean=v=>typeof v==='string'?v.slice(0,3000):'';
const safeUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:undefined;}catch{return undefined;}};
export function recordActivity(run,{method,params:p={} },now=new Date().toISOString()){
  run.lastResearchEventAt=now;
  run.activity??=[];
  const item=p.item||{}, id=p.itemId||item.id;
  let entry;
  if(method==='item/started'||method==='item/completed'){
    const state=method==='item/started'?'started':'completed';
    if(item.type==='webSearch'){
      const a=item.action||{};
      entry={id:id||`search-${run.activity.length}`,kind:'observed',state,label:a.type==='openPage'?'Opening source':a.type==='findInPage'?'Finding text in source':'Searching sources',detail:clean(a.query||a.queries?.join('; ')||item.query||a.pattern||a.url),url:safeUrl(a.url)};
    }else if(item.type==='reasoning')entry={id:id||'reasoning',kind:'observed',state,label:'Analysis activity'};
    else if(item.type==='agentMessage'&&item.phase==='commentary'&&state==='completed')entry={id:id||`update-${run.activity.length}`,kind:'agent',state,label:'Agent update',detail:clean(item.text)};
    else if(item.type==='agentMessage'&&state==='started')entry={id:id||'response',kind:'observed',state,label:item.phase==='commentary'?'Preparing an update':'Preparing response'};
    else if(item.type==='contextCompaction')entry={id:id||'compaction',kind:'observed',state,label:'Condensing research context'};
  }else if(method==='item/reasoning/summaryTextDelta'){
    const key=`summary-${id}-${p.summaryIndex||0}`;
    const old=run.activity.find(e=>e.id===key);
    entry={id:key,kind:'summary',state:'updated',label:'Agent summary',detail:clean((old?.detail||'')+clean(p.delta))};
  }else if(method==='turn/started')entry={id:'turn-start',kind:'observed',state:'completed',label:'Codex accepted the research turn'};
  else if(method==='turn/completed')entry={id:'turn-end',kind:'observed',state:'completed',label:`Research turn ${clean(p.turn?.status)||'ended'}`};
  else if(method==='turn/plan/updated')entry={id:'plan',kind:'agent',state:'updated',label:'Agent plan',detail:clean((p.plan||[]).map(x=>`${x.status}: ${x.step}`).join('\n'))};
  if(entry){const i=run.activity.findIndex(e=>e.id===entry.id);const next={...entry,at:now};if(i<0)run.activity.push(next);else run.activity[i]=next;run.activity=run.activity.slice(-150);}
  return run;
}
