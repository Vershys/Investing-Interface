'use client';
import LiveQuote from './live-quote';
import {memo,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Search,RefreshCw} from 'lucide-react';
import {brokerUrl,marketSymbols,normalizeSymbol,providerUrl} from '@/lib/market';

// Use only documented public embeds; the provider owns quotes and transport.
// The fixed script allowlist excludes arbitrary script or endpoint injection.
const scripts={quote:'symbol-info',chart:'advanced-chart'} as const;
export const MarketWidget=memo(function MarketWidget({symbol,theme,kind}:{symbol:string;theme:string;kind:keyof typeof scripts}) {
 const host=useRef<HTMLDivElement>(null);const [near,setNear]=useState(false);const [active,setActive]=useState(true);const [failed,setFailed]=useState(false);const [attempt,setAttempt]=useState(0);
 useEffect(()=>{const el=host.current;if(!el)return;const observer=new IntersectionObserver(([entry])=>setNear(entry.isIntersecting),{rootMargin:'180px'});observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{let timeout:ReturnType<typeof setTimeout>|undefined;const handle=()=>{clearTimeout(timeout);if(document.hidden)timeout=setTimeout(()=>setActive(false),30000);else setActive(true);};handle();document.addEventListener('visibilitychange',handle);return()=>{clearTimeout(timeout);document.removeEventListener('visibilitychange',handle);};},[]);
 useEffect(()=>{
  const el=host.current;if(!el||!near||!active)return;
  setFailed(false);el.replaceChildren();
  const widget=document.createElement('div');widget.className='tradingview-widget-container';widget.style.height='100%';widget.style.width='100%';
  const target=document.createElement('div');target.className='tradingview-widget-container__widget';target.style.height=kind==='chart'?'calc(100% - 32px)':'100%';target.style.width='100%';widget.appendChild(target);
  const script=document.createElement('script');script.src=`https://s3.tradingview.com/external-embedding/embed-widget-${scripts[kind]}.js`;script.async=true;
  const config=kind==='quote'?{symbol,width:'100%',locale:'en',colorTheme:theme,isTransparent:true}:{symbol,autosize:true,interval:'D',timezone:'America/New_York',theme,style:'3',locale:'en',allow_symbol_change:false,calendar:false,hide_side_toolbar:false,support_host:'https://www.tradingview.com',backgroundColor:theme==='dark'?'#0f0f0f':'#fafafa'};
  script.textContent=JSON.stringify(config);script.onerror=()=>setFailed(true);
  widget.appendChild(script);el.appendChild(widget);
  // iframe presence confirms embed initialization, not successful market-data delivery.
  const timer=setTimeout(()=>{if(!el.querySelector('iframe'))setFailed(true);},15000);
  return()=>{clearTimeout(timer);script.onerror=null;el.replaceChildren();};
 },[symbol,theme,kind,near,active,attempt]);
 return <section className={`market-widget ${kind}`} aria-label={`${symbol} ${kind==='quote'?'quote and statistics':'market chart'} from TradingView`}><div ref={host} className="widget-host"/>{!active&&<p className="market-fallback">Market display paused while this tab is inactive.</p>}{failed&&<div className="market-fallback" role="status"><p>Market display could not load. Your network or content blocker may be preventing it.</p><button className="text-button" onClick={()=>setAttempt(x=>x+1)}><RefreshCw size={14}/> Retry</button></div>}<a className="provider-credit" href={providerUrl(symbol)} target="_blank" rel="noopener noreferrer">{symbol.split(':').at(-1)} market data by TradingView ↗</a></section>;
});
export function BrokerBubble({symbol}:{symbol:string}){return <a className="broker-bubble" href={brokerUrl(symbol)} target="_blank" rel="noopener noreferrer">Open {symbol.split(':').at(-1)} in Robinhood <ArrowUpRight size={15}/></a>}
export const MarketSidebar=memo(function MarketSidebar({symbol,theme,onSelect,onChart}:{symbol:string;theme:string;onSelect:(s:string)=>void;onChart:()=>void}) {
 const [input,setInput]=useState('');const [error,setError]=useState('');
 const matches=marketSymbols.filter(x=>`${x.symbol} ${x.name}`.toLowerCase().includes(input.toLowerCase()));
 function submit(e:React.FormEvent){e.preventDefault();const next=normalizeSymbol(input);if(!next){setError('Enter a US ticker, such as AAPL or NYSE:LUMN.');return;}setError('');onSelect(next);}
 return <aside className="market-sidebar" aria-label="Stock market browser"><div className="section-title"><h2>Market browser</h2><span className="badge">PROVIDER DATA</span></div><p className="market-caption">Stock quotes · delayed feed available</p><form className="market-search" onSubmit={submit}><Search size={16}/><input type="search" aria-label="Find a stock by ticker or company" placeholder="Ticker or company" value={input} onChange={e=>{setInput(e.target.value);setError('');}} maxLength={25}/><button type="submit" aria-label="Load ticker"><ArrowUpRight size={17}/></button></form>{error&&<p role="alert" className="market-caption">{error}</p>}<div className="symbol-options">{matches.map(x=><button key={x.symbol} aria-pressed={symbol===x.symbol} onClick={()=>{onSelect(x.symbol);setError('');}}><strong>{x.symbol.split(':')[1]}</strong><span>{x.name}</span></button>)}{!matches.length&&<p className="market-caption">Press Enter to look up an exact ticker. Use EXCHANGE:TICKER if ambiguous.</p>}</div><div className="selected-market"><p className="eyebrow">{symbol} / SELECTED SECURITY</p><LiveQuote symbol={symbol}/><p className="eyebrow delayed-label">DELAYED MARKET DISPLAY</p><MarketWidget symbol={symbol} theme={theme} kind="quote"/><BrokerBubble symbol={symbol}/><p className="market-caption">Opens your broker; no order is submitted. Confirm the security and executable price there.</p><button className="market-chart-button" onClick={onChart}>Explore market chart <ArrowUpRight size={16}/></button></div><p className="market-disclosure">Quotes and statistics come directly from TradingView. Stock widget data is delayed. Read the feed’s time and delay indicators; the latest observation may be a previous close. Some symbols are unavailable. These quotes do not update the demo portfolio.</p></aside>;
});
