import {database} from '@/db/store';
import {recordSchema,validateRecord,type MemoryRecord,type RecordInput,type JournalNote,type AgentRun} from './types';
export class AppError extends Error{constructor(message:string,public status=400){super(message);}}
const projection='id,version,kind,ticker,title,body,status,payload,created_at AS createdAt,actor';
function record(row:Record<string,unknown>):MemoryRecord{return {...row,payload:JSON.parse(String(row.payload))} as MemoryRecord;}
export async function listRecords(userId:string,ticker?:string){
 const r=await database().prepare(`SELECT ${projection} FROM memory_records m WHERE user_id=? AND version=(SELECT MAX(version) FROM memory_records n WHERE n.user_id=m.user_id AND n.id=m.id) ${ticker?'AND (ticker=? OR ticker=\'PORTFOLIO\')':''} ORDER BY created_at DESC LIMIT 300`).bind(...(ticker?[userId,ticker]:[userId])).all<Record<string,unknown>>();return r.results.map(record);
}
export async function getRecord(userId:string,id:string){const r=await database().prepare(`SELECT ${projection} FROM memory_records WHERE user_id=? AND id=? ORDER BY version DESC LIMIT 1`).bind(userId,id).first<Record<string,unknown>>();return r?record(r):null;}
export async function saveRecord(userId:string,raw:RecordInput,actor='user'){
 const p=validateRecord(recordSchema.parse(raw));const old=await getRecord(userId,p.id);
 if((old?.version||0)!==p.expectedVersion)throw new AppError('This record changed. Reload its latest version before saving.',409);
 if(old&&(old.kind!==p.kind||old.ticker!==p.ticker))throw new AppError('Record type and security cannot change. Create a new record.');
 const now=new Date().toISOString();const version=p.expectedVersion+1;
 try{await database().prepare('INSERT INTO memory_records (user_id,id,version,kind,ticker,title,body,status,payload,created_at,actor) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(userId,p.id,version,p.kind,p.ticker,p.title,p.body,p.status,JSON.stringify(p.payload),now,actor).run();}catch(e){if(String(e).includes('UNIQUE'))throw new AppError('Another edit was saved first. Reload and retry.',409);throw e;}
 return {...p,version,createdAt:now,actor} as MemoryRecord;
}
export async function journalNotes(userId:string,ticker?:string){const r=await database().prepare(`SELECT id,ticker,body,decision,created_at AS createdAt FROM journal WHERE user_id=? ${ticker?"AND (ticker=? OR ticker='PORTFOLIO')":''} ORDER BY created_at DESC LIMIT 100`).bind(...(ticker?[userId,ticker]:[userId])).all<JournalNote>();return r.results;}
export async function runs(userId:string,threadId?:string){const r=await database().prepare(`SELECT id,thread_id AS threadId,ticker,question,answer,status,manifest,actions,checkpoint,input_tokens AS inputTokens,output_tokens AS outputTokens,cached_tokens AS cachedTokens,created_at AS createdAt,model FROM agent_runs WHERE user_id=? ${threadId?'AND thread_id=?':''} ORDER BY created_at DESC LIMIT 40`).bind(...(threadId?[userId,threadId]:[userId])).all<Record<string,unknown>>();return r.results.map(x=>({...x,manifest:JSON.parse(String(x.manifest)),actions:JSON.parse(String(x.actions))}) as AgentRun);}
export async function history(userId:string,id:string){const r=await database().prepare(`SELECT ${projection} FROM memory_records WHERE user_id=? AND id=? ORDER BY version DESC LIMIT 50`).bind(userId,id).all<Record<string,unknown>>();return r.results.map(record);}
export async function monitorState(userId:string){const db=database();const [events,check]=await Promise.all([db.prepare('SELECT id,rule_id AS ruleId,ticker,body,status,created_at AS createdAt FROM monitor_events WHERE user_id=? ORDER BY created_at DESC LIMIT 80').bind(userId).all(),db.prepare('SELECT checked_at AS checkedAt,status,detail FROM monitor_checks WHERE user_id=?').bind(userId).first()]);return {events:events.results,check};}
