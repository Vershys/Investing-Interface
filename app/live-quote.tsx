'use client';
import {useEffect,useState} from 'react';
import {money,pct,signed} from '@/lib/finance';
import {BrokerBubble} from './market-widgets';
type Quote={symbol:string;price:number;change:number;percentChange:number;open:number;high:number;low:number;previousClose:number;asOf:string;fetchedAt:string;source:string};
export default function LiveQuote({symbol,onAvailability}:{symbol:string;onAvailability?:(available:boolean)=>void}){
 const [quote,setQuote]=useState<Quote|null>(null);const [message,setMessage]=useState('Checking quote availability…');const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;let controller:AbortController|undefined;let configured=true;let failures=0;
  setQuote(null);onAvailability?.(false);setMessage('Checking quote availability…');
  async function refresh(){if(stopped||document.hidden||!configured)return;controller?.abort();controller=new AbortController();
   try{const r=await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`,{signal:controller.signal});const d=await r.json() as {status:string;message?:string;error?:string;quote?:Quote};if(stopped)return;
    if(d.status==='not_configured'){configured=false;setMessage('Real-time quotes need provider setup. Delayed market data is available below.');return;}
    if(!r.ok||!d.quote)throw new Error(d.error||'Quote unavailable');setQuote(d.quote);onAvailability?.(true);setMessage('Updates every 30 seconds while this tab is visible.');failures=0;
   }catch(e){if(stopped||(e instanceof DOMException&&e.name==='AbortError'))return;failures++;setMessage('Could not refresh. Any price shown is the last received quote.');}
   if(!stopped&&configured)timer=setTimeout(refresh,Math.min(300000,30000*2**failures));
  }
  const visibility=()=>{clearTimeout(timer);controller?.abort();if(!document.hidden)void refresh();};document.addEventListener('visibilitychange',visibility);void refresh();
  return()=>{stopped=true;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visibility);};
 },[symbol,attempt,onAvailability]);
 return <div className="direct-quote"><p className="market-caption">{message}</p>{quote&&<><div className="direct-price">{money(quote.price)}</div><p className={quote.change>=0?'positive':'negative'}>{signed(quote.change)} ({pct(quote.percentChange)})</p><p className="market-caption">{quote.source} · Quote as of {new Date(quote.asOf).toLocaleString()}<br/>Received {new Date(quote.fetchedAt).toLocaleTimeString()}. Exchange entitlement and session affect freshness.</p><BrokerBubble symbol={symbol}/><dl className="facts"><div><dt>Open</dt><dd>{money(quote.open)}</dd></div><div><dt>Day high / low</dt><dd>{money(quote.high)} / {money(quote.low)}</dd></div><div><dt>Previous close</dt><dd>{money(quote.previousClose)}</dd></div></dl></>}<button className="text-button" onClick={()=>setAttempt(n=>n+1)}>Check quote connection</button></div>;
}
