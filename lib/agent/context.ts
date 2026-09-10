import type {MemoryRecord,JournalNote,Focus,AgentRun} from './types';
import {holdings,portfolioValue,CASH} from '../finance.ts';
// Bytes provide a conservative upper bound for common byte-based tokenizers.
// This is a packing bound, not reported provider token usage.
export const byteSize=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
export function compileContext({records,notes,focus,question,previous,recent=[]}:{records:MemoryRecord[];notes:JournalNote[];focus:Focus;question:string;previous?:AgentRun;recent?:AgentRun[]}){
 const relevant=(ticker:string)=>focus.ticker==='PORTFOLIO'||ticker==='PORTFOLIO'||ticker===focus.ticker;
 const required=records.filter(r=>r.kind==='intent'&&r.status==='accepted'&&relevant(r.ticker));
 const conversation=recent.slice(0,3).reverse().map(r=>({runId:r.id,question:r.question,answer:r.checkpoint}));
 const selected:MemoryRecord[]=[...required];const omitted:string[]=[];const selectedNotes:JournalNote[]=[];
 const oldVersions=(previous?.manifest?.versions||{}) as Record<string,number>;
 const candidates=records.filter(r=>!required.includes(r)&&relevant(r.ticker)&&r.status!=='superseded').sort((a,b)=>Number(b.status==='accepted')-Number(a.status==='accepted')||b.createdAt.localeCompare(a.createdAt));
 const base={question,focus,recentConversation:conversation,portfolio:{mode:'demo',asOf:'2026-09-09',value:portfolioValue,cash:CASH,holdings:holdings.filter(h=>relevant(h.ticker))},checkpoint:previous?{question:previous.question,summary:previous.checkpoint,runId:previous.id}:null};
 while(conversation.length&&byteSize({...base,records:selected})>15000)conversation.shift();
 if(byteSize({...base,records:selected})>15000)throw new Error('Required intent exceeds the context budget. Narrow the question to one company.');
 for(const r of candidates){if(byteSize({...base,records:[...selected,r],notes:selectedNotes})<=19000)selected.push(r);else omitted.push(r.id);}
 for(const n of notes.filter(n=>relevant(n.ticker))){if(byteSize({...base,records:selected,notes:[...selectedNotes,n]})<=22000)selectedNotes.push(n);else omitted.push(`journal:${n.id}`);}
 const versions=Object.fromEntries(selected.map(r=>[r.id,r.version]));
 const manifest={compilerVersion:1,focus,versions,acceptedIntentIds:required.map(r=>r.id).sort(),journalIds:selectedNotes.map(n=>n.id),changedSincePrevious:selected.filter(r=>oldVersions[r.id]!==r.version).map(r=>r.id),previousRunId:previous?.id||null,recentRunIds:conversation.map(r=>r.runId),omitted,limitations:['Portfolio is demonstration data.','No private conversation outside Bastion is automatically available.','Records not retrieved may contain relevant information.'],builtAt:new Date().toISOString()};
 const context={...base,records:selected,notes:selectedNotes,manifest};return {context,manifest,bytes:byteSize(context)};
}
