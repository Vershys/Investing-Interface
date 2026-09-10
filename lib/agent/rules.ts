import {ruleSchema,type MemoryRecord} from './types.ts';
export function ruleTriggered(rule:MemoryRecord,observation:{price:number;percentChange:number}|null,now=Date.now()){
 const parsed=ruleSchema.safeParse(rule.payload);if(!parsed.success||rule.status!=='active')return false;const p=parsed.data;
 if(p.type==='review_date')return new Date(p.reviewAt!).getTime()<=now;
 if(!observation)return false;
 if(p.type==='price_above')return observation.price>=p.threshold!;
 if(p.type==='price_below')return observation.price<=p.threshold!;
 return Math.abs(observation.percentChange)>=p.threshold!;
}
