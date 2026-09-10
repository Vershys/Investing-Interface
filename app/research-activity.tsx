'use client';
import {useEffect,useState} from 'react';
import type {Run} from '@/lib/research/types';
const age=(at:string|undefined,now:number)=>at?Math.max(0,Math.floor((now-Date.parse(at))/1000)):null;
const elapsed=(seconds:number|null)=>seconds===null?'Not received':seconds<60?`${seconds}s`:`${Math.floor(seconds/60)}m ${seconds%60}s`;
export function ResearchActivity({run,checkedAt,offline}:{run:Run;checkedAt:number;offline:boolean}){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const active=['running','queued'].includes(run.status), silence=age(run.lastResearchEventAt,now);
 const entries=run.activity||[];
 const latest=[...entries].reverse().find(e=>e.kind==='observed'&&e.id!=='turn-end');
 const serviceStale=offline||!checkedAt||now-checkedAt>15000;
 return <div className="rd-activity">
 <div className="rd-health" aria-label="Research health">
 <div><span>Local service</span><strong>{serviceStale?'Connection unavailable':'Connected'}</strong><small>{checkedAt?`Last response ${elapsed(Math.max(0,Math.floor((now-checkedAt)/1000)))} ago`:'Waiting for response'}</small></div>
 <div><span>{active?'Last research event':'Research activity'}</span><strong>{silence===null?'Waiting for first event':active?`${elapsed(silence)} ago`:'Run ended'}</strong><small>Separate from the service connection</small></div>
 <div><span>{active?'Elapsed':'Run duration'}</span><strong>{elapsed(age(run.createdAt,active?now:Date.parse(run.completedAt||run.createdAt)))}</strong><small>{entries.filter(e=>e.kind==='observed'&&e.state==='completed'&&!e.id.startsWith('turn-')).length} recorded operations completed</small></div>
 </div>
 {active&&(silence===null||silence>60)&&<p className="rd-notice" role="status">{silence===null?'Waiting for the first research event. Starting the service does not confirm model progress.':`No research events received for ${elapsed(silence)}. The request may still be processing. This is not proof of a stall.`} {serviceStale?'The page cannot currently confirm service health.':'The local service is responding.'}</p>}
 {latest&&<p><span className="muted">Last observed activity: </span>{latest.label}{latest.detail?` — ${latest.detail}`:''}</p>}
 <details className="rd-activity-log" open={active||undefined}><summary>Research activity · {entries.length} recent records</summary><p className="muted">Observed events describe reported operations. Agent updates and summaries are not a complete account of internal reasoning. Up to 150 recent records are saved with this run.</p>
 {!entries.length&&<p className="muted">No activity recorded yet. Older runs may not contain a timeline.</p>}
 <ol>{entries.map(e=><li key={e.id}><div><strong>{e.label}</strong><span>{e.kind==='observed'?'Observed':e.kind==='summary'?'Agent summary':'Agent update'} · {e.state} · {new Date(e.at).toLocaleTimeString()}</span></div>{e.detail&&<p>{e.detail}</p>}{e.url&&<a href={e.url} target="_blank" rel="noreferrer">Open source</a>}</li>)}</ol></details>
 </div>;
}
