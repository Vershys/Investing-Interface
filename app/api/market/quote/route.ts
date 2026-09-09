import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {normalizeSymbol} from '@/lib/market';
type Quote={symbol:string;price:number;change:number;percentChange:number;open:number;high:number;low:number;previousClose:number;asOf:string;fetchedAt:string;source:string};
const cache=new Map<string,{until:number;quote:Quote}>();
const pending=new Map<string,Promise<Quote>>();
const TTL=15000;
async function quoteFor(symbol:string,key:string){
 const existing=cache.get(symbol);if(existing&&existing.until>Date.now())return existing.quote;
 const active=pending.get(symbol);if(active)return active;
 if(pending.size>=4)throw new Error('busy');
 const task=(async()=>{
  const response=await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`,{headers:{'X-Finnhub-Token':key},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(response.status===429?'rate_limited':'provider_unavailable');
  const d=await response.json() as Record<string,unknown>;
  if(!['c','d','dp','o','h','l','pc','t'].every(k=>typeof d[k]==='number'&&Number.isFinite(d[k]))||Number(d.c)<=0||Number(d.t)<=0)throw new Error('quote_unavailable');
  const q:Quote={symbol,price:Number(d.c),change:Number(d.d),percentChange:Number(d.dp),open:Number(d.o),high:Number(d.h),low:Number(d.l),previousClose:Number(d.pc),asOf:new Date(Number(d.t)*1000).toISOString(),fetchedAt:new Date().toISOString(),source:'Finnhub'};
  if(cache.size>=128)cache.delete(cache.keys().next().value!);cache.set(symbol,{until:Date.now()+TTL,quote:q});return q;
 })();pending.set(symbol,task);try{return await task;}finally{pending.delete(symbol);}
}
export async function GET(request:Request){
 if(!await getChatGPTUser())return Response.json({error:'Sign in to load quotes.'},{status:401});
 const raw=new URL(request.url).searchParams.get('symbol')||'';const normalized=normalizeSymbol(raw);
 if(!normalized)return Response.json({error:'Invalid US stock symbol.'},{status:400});
 if(!env.FINNHUB_API_KEY)return Response.json({status:'not_configured',message:'Real-time provider access is not configured. The TradingView display below is delayed.'},{headers:{'Cache-Control':'private, max-age=60'}});
 try{return Response.json({status:'ok',quote:await quoteFor(normalized.split(':').at(-1)!,env.FINNHUB_API_KEY)},{headers:{'Cache-Control':'private, max-age=15'}});}
 catch(e){const limited=e instanceof Error&&(e.message==='busy'||e.message==='rate_limited');return Response.json({status:'unavailable',error:limited?'Quote requests are temporarily limited.':'The provider did not return an available quote.'},{status:limited?429:503,headers:{'Retry-After':'60','Cache-Control':'no-store'}});}
}
