import {z} from 'zod';
import {scenarioValue} from '../finance.ts';
export const tickerSchema=z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9.:-]{0,23}$/);
export const inputsSchema=z.object({ebitda:z.number().min(0).max(10000),multiple:z.number().min(0).max(100),debt:z.number().min(0).max(10000),shares:z.number().min(.001).max(10000)}).strict();
export type ScenarioInputs=z.infer<typeof inputsSchema>;
export const recordSchema=z.object({id:z.string().uuid(),expectedVersion:z.number().int().min(0),kind:z.enum(['intent','scenario','evidence','investigation','rule']),ticker:tickerSchema,title:z.string().trim().min(1).max(160),body:z.string().max(6000),status:z.enum(['exploratory','accepted','draft','completed','paused','active','superseded']),payload:z.record(z.unknown()).default({})}).strict();
export type RecordInput=z.infer<typeof recordSchema>;
export type MemoryRecord=Omit<RecordInput,'expectedVersion'> & {version:number;createdAt:string;actor:string};
export type JournalNote={id:string;ticker:string;body:string;decision:string;createdAt:string};
export type Focus={ticker:string;view:string;range:string;scenario?:ScenarioInputs};
export type UIAction={type:'view'|'range'|'security'|'compare'|'scenario'|'sort';value:string;inputs?:ScenarioInputs};
export type AgentRun={id:string;threadId:string;ticker:string;question:string;answer:string;status:string;manifest:Record<string,unknown>;actions:unknown[];checkpoint:string;inputTokens:number;outputTokens:number;cachedTokens:number;createdAt:string;model:string};
export const focusSchema=z.object({ticker:tickerSchema,view:z.enum(['overview','markets','research','scenarios','journal','agent']),range:z.enum(['1D','1W','1M','3M','YTD','1Y','ALL']),scenario:inputsSchema.optional()});
export const ruleSchema=z.object({type:z.enum(['price_above','price_below','daily_move','review_date']),threshold:z.number().min(0).max(1e9).optional(),reviewAt:z.string().datetime().optional()}).superRefine((x,ctx)=>{if(x.type==='review_date'&&!x.reviewAt)ctx.addIssue({code:'custom',message:'Choose a review date.'});if(x.type!=='review_date'&&x.threshold===undefined)ctx.addIssue({code:'custom',message:'Enter a threshold.'});});
export function validateRecord(input:RecordInput){
 if(input.kind==='scenario'){const v=inputsSchema.parse(input.payload.inputs);input.payload={...input.payload,inputs:v,value:scenarioValue(v.ebitda,v.multiple,v.debt,v.shares),units:'USD billions; shares billions',model:'EV/EBITDA'};}
 if(input.kind==='rule')ruleSchema.parse(input.payload);
 if(input.kind==='evidence'){const url=input.payload.url;z.string().url().startsWith('https://','Evidence needs an HTTPS source URL.').parse(url);}
 return input;
}
