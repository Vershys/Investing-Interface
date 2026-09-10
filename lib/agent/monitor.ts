import {env} from 'cloudflare:workers';
import {database} from '@/db/store';
import {listRecords,monitorState,AppError} from './store';
import {ruleSchema,type MemoryRecord} from './types';
import {ruleTriggered} from './rules';
export async function checkMonitor(userId:string){
 const db=database(),now=new Date().toISOString(),cutoff=new Date(Date.now()-60000).toISOString();
 await db.prepare("INSERT INTO monitor_checks (user_id,checked_at,status,detail) VALUES (?,'1970-01-01','idle','') ON CONFLICT(user_id) DO NOTHING").bind(userId).run();
 const lease=await db.prepare("UPDATE monitor_checks SET checked_at=?,status='checking' WHERE user_id=? AND checked_at<? RETURNING user_id").bind(now,userId,cutoff).first();if(!lease)throw new AppError('Checks are limited to once per minute. Recent results are saved.',429);
 const rules=(await listRecords(userId)).filter(r=>r.kind==='rule'&&r.status==='active');let created=0;const gaps:string[]=[];const observations=new Map<string,{price:number;percentChange:number;asOf:string}|null>();
 try{
  const symbols=[...new Set(rules.filter(r=>r.payload.type!=='review_date').map(r=>r.ticker))].slice(0,12);
  for(const ticker of symbols){
   if(!env.FINNHUB_API_KEY){observations.set(ticker,null);continue;}
   try{const r=await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker.split(':').at(-1)!)}`,{headers:{'X-Finnhub-Token':env.FINNHUB_API_KEY},signal:AbortSignal.timeout(5000)});if(!r.ok)throw new Error();const q=await r.json() as {c:number;dp:number;t:number};if(!Number.isFinite(q.c)||q.c<=0||!Number.isFinite(q.dp)||!Number.isFinite(q.t)||Date.now()-q.t*1000>20*60000||q.t*1000>Date.now()+60000)throw new Error();observations.set(ticker,{price:q.c,percentChange:q.dp,asOf:new Date(q.t*1000).toISOString()});}catch{observations.set(ticker,null);}
  }
  for(const rule of rules){
   const quote=observations.get(rule.ticker)||null;
   if(rule.payload.type!=='review_date'&&!quote){gaps.push(rule.ticker);continue;}
   if(!ruleTriggered(rule,quote))continue;
   const key=`${rule.id}:${rule.version}:${rule.payload.type==='review_date'?'due':now.slice(0,10)}`;
   const body=rule.payload.type==='review_date'?`Review due: ${rule.title}. ${rule.body}`:`${rule.title}: ${rule.ticker} at $${quote!.price.toFixed(2)}, daily move ${quote!.percentChange.toFixed(2)}%. Observation ${quote!.asOf}. This threshold signal does not establish a cause.`;
   const r=await db.prepare('INSERT INTO monitor_events (id,user_id,rule_id,dedupe_key,ticker,body,status,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,dedupe_key) DO NOTHING').bind(crypto.randomUUID(),userId,rule.id,key,rule.ticker,body,'new',now).run();created+=r.meta.changes;
  }
  const detail=`${rules.length} active rules · ${created} new alerts${gaps.length?` · No fresh quote for ${[...new Set(gaps)].join(', ')}`:''}. Price rules require an observation within 20 minutes; markets may be closed. No LLM calls used.`;
  await db.prepare('UPDATE monitor_checks SET status=?,detail=? WHERE user_id=?').bind(gaps.length?'partial':'completed',detail,userId).run();return {...await monitorState(userId),created};
 }catch(e){await db.prepare("UPDATE monitor_checks SET status='failed',detail='Check interrupted. Retry after one minute.' WHERE user_id=?").bind(userId).run();throw e;}
}
