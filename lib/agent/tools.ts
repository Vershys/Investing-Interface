import {z} from 'zod';
import {env} from 'cloudflare:workers';
import {database} from '@/db/store';
import {listRecords,journalNotes,saveRecord,AppError} from './store';
import {inputsSchema,tickerSchema,type UIAction,type ScenarioInputs} from './types';
import {normalizeSymbol} from '../market';
import {scenarioValue} from '../finance';
const properties={action:{type:'string',enum:['navigate','sort_positions','set_range','focus_security','compare_benchmark','create_scenario','save_note','create_rule','search_memory','company_news']},ticker:{type:'string'},value:{type:'string'},title:{type:'string'},body:{type:'string'},ebitda:{type:['number','null']},multiple:{type:['number','null']},debt:{type:['number','null']},shares:{type:['number','null']},threshold:{type:['number','null']}};
export const toolDefinitions=[{type:'function',name:'workspace_action',description:'Read memory or company news, or perform a user-requested reversible workspace action. Never change accepted intent. Numeric scenario units: EBITDA and net debt in USD billions; diluted shares in billions. Supply unused text as empty strings and unused numbers as null. Rule value: price_above, price_below, daily_move, or review_date (ISO date in body). Sort value: Position value, Daily contribution, Largest loss, or Ticker. Navigation value: overview, markets, research, scenarios, journal, agent. Search memory value is a literal query. Range value: 1D,1W,1M,3M,YTD,1Y,ALL.',strict:true,parameters:{type:'object',properties,required:Object.keys(properties),additionalProperties:false}}];
const argsSchema=z.object({action:z.enum(['navigate','sort_positions','set_range','focus_security','compare_benchmark','create_scenario','save_note','create_rule','search_memory','company_news']),ticker:z.string().max(24),value:z.string().max(100),title:z.string().max(160),body:z.string().max(6000),ebitda:z.number().nullable(),multiple:z.number().nullable(),debt:z.number().nullable(),shares:z.number().nullable(),threshold:z.number().nullable()}).strict();
export async function executeTool(userId:string,raw:unknown,operationId:string){
 const a=argsSchema.parse(raw);let ui:UIAction|undefined;
 if(a.action==='sort_positions')ui={type:'sort',value:z.enum(['Position value','Daily contribution','Largest loss','Ticker']).parse(a.value)};
 if(a.action==='navigate'){const value=z.enum(['overview','markets','research','scenarios','journal','agent']).parse(a.value);ui={type:'view',value};}
 if(a.action==='set_range'){ui={type:'range',value:z.enum(['1D','1W','1M','3M','YTD','1Y','ALL']).parse(a.value)};}
 if(a.action==='focus_security'){const symbol=normalizeSymbol(a.ticker);if(!symbol)throw new AppError('Unsupported market symbol. Use the market search to select a verified listing.');ui={type:'security',value:symbol};}
 if(a.action==='compare_benchmark')ui={type:'compare',value:'true'};
 if(ui)return {message:'View change prepared for the current website session.',ui};
 if(a.action==='search_memory'){
 const [records,notes]=await Promise.all([listRecords(userId,a.ticker||undefined),journalNotes(userId,a.ticker||undefined)]);const q=a.value.toLowerCase();const conversations=await database().prepare('SELECT id,question,answer,status,created_at AS createdAt FROM agent_runs WHERE user_id=? AND (instr(lower(question),?)>0 OR instr(lower(answer),?)>0) ORDER BY created_at DESC LIMIT 3').bind(userId,q,q).all();return {records:records.filter(r=>(r.title+' '+r.body).toLowerCase().includes(q)).slice(0,6),notes:notes.filter(n=>n.body.toLowerCase().includes(q)).slice(0,4),conversations:conversations.results,limited:true};
 }
 const ticker=tickerSchema.parse(a.ticker);
 if(a.action==='company_news'){
  if(!env.FINNHUB_API_KEY)throw new AppError('Company news is unavailable until a market-data provider is connected.');
  const to=new Date().toISOString().slice(0,10),from=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  const r=await fetch(`https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker.split(':').at(-1)!)}&from=${from}&to=${to}`,{headers:{'X-Finnhub-Token':env.FINNHUB_API_KEY},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new AppError('News provider unavailable.');
  const data=await r.json() as {headline:string;summary:string;url:string;datetime:number;source:string}[];if(!Array.isArray(data))throw new AppError('News provider returned an invalid response.');
  return {untrustedSourceContent:true,news:data.slice(0,6).map(n=>({title:n.headline,excerpt:String(n.summary||'').slice(0,900),url:/^https:\/\//.test(n.url)?n.url:null,publishedAt:new Date(n.datetime*1000).toISOString(),source:n.source})),limitations:'Headlines and excerpts are not proof of causation. Cite their actual URLs.'};
 }
 if(a.action==='save_note'){
  if(!a.body.trim())throw new AppError('A note needs text.');
  await database().prepare('INSERT INTO journal (id,user_id,ticker,body,decision,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(operationId,userId,ticker,a.body,'Research',new Date().toISOString()).run();return {message:`Saved a research note for ${ticker}.`,recordId:operationId};
 }
 if(a.action==='create_scenario'){
  const inputs:ScenarioInputs=inputsSchema.parse({ebitda:a.ebitda,multiple:a.multiple,debt:a.debt,shares:a.shares});
  const r=await saveRecord(userId,{id:operationId,expectedVersion:0,kind:'scenario',ticker,title:a.title||'Assistant scenario',body:a.body,status:'exploratory',payload:{inputs,units:'USD billions; shares billions',model:'EV/EBITDA',value:scenarioValue(inputs.ebitda,inputs.multiple,inputs.debt,inputs.shares)}},'assistant');
  return {message:'Saved an exploratory scenario. It does not replace accepted assumptions.',recordId:r.id,value:r.payload.value,ui:{type:'scenario',value:ticker,inputs} as UIAction};
 }
 if(a.action==='create_rule'){
  const type=z.enum(['price_above','price_below','daily_move','review_date']).parse(a.value);
  const payload=type==='review_date'?{type,reviewAt:z.string().datetime().parse(a.body)}:{type,threshold:z.number().min(0).parse(a.threshold)};
  const r=await saveRecord(userId,{id:operationId,expectedVersion:0,kind:'rule',ticker,title:a.title||`${ticker} ${type}`,body:a.body,status:'active',payload},'assistant');return {message:'Monitoring rule saved. Checks run when requested or when a server scheduler is configured.',recordId:r.id};
 }
 throw new AppError('Unsupported action.');
}
