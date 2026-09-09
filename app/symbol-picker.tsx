'use client';
import {useEffect,useState} from 'react';
import {Command,CommandInput,CommandList,CommandItem,CommandEmpty} from '@/components/ui/command';
import {marketSymbols} from '@/lib/market';
import type {SecurityResult} from '@/lib/symbol-search';
const initial:SecurityResult[]=marketSymbols.map(x=>({symbol:x.symbol.split(':')[1],name:x.name,exchange:x.symbol.split(':')[0],chartSymbol:x.symbol,source:'Suggested'}));
const cache=new Map<string,{until:number;results:SecurityResult[];coverage:string}>();
export default function SymbolPicker({onSelect}:{onSelect:(s:string)=>void}){
 const [query,setQuery]=useState('');const [results,setResults]=useState(initial);const [status,setStatus]=useState('Search by ticker or company · ↑ ↓ to browse · Enter to select');
 useEffect(()=>{const q=query.trim();if(!q){setResults(initial);setStatus('Suggested securities · Search by ticker or company');return;}let disposed=false;const controller=new AbortController();setResults([]);setStatus('Searching…');const hit=cache.get(q.toUpperCase());if(hit&&hit.until>Date.now()){setResults(hit.results);setStatus(hit.coverage);return;}
 const timer=setTimeout(async()=>{try{const response=await fetch(`/api/market/search?q=${encodeURIComponent(q)}`,{signal:controller.signal});if(!response.ok)throw Error();const data=await response.json() as {results:SecurityResult[];coverage:string};if(disposed)return;if(cache.size>=64)cache.delete(cache.keys().next().value!);cache.set(q.toUpperCase(),{...data,until:Date.now()+300000});setResults(data.results);setStatus(data.coverage);}catch{if(!disposed){setResults([]);setStatus('Search unavailable. Edit the query to retry.');}}},200);
 return()=>{disposed=true;clearTimeout(timer);controller.abort();};},[query]);
 return <div className="security-picker"><Command shouldFilter={false} label="Security search"><CommandInput aria-label="Search securities by company or ticker" placeholder="Search stocks & ADRs" value={query} onValueChange={setQuery} maxLength={64}/><CommandList aria-label="Matching securities"><CommandEmpty>{status==='Searching…'?'Searching…':'No selectable matches.'}</CommandEmpty>{results.map(x=><CommandItem key={`${x.exchange}:${x.symbol}`} value={`${x.exchange}:${x.symbol}`} onSelect={()=>{if(x.chartSymbol)onSelect(x.chartSymbol);else window.open(`https://www.tradingview.com/symbols/${encodeURIComponent(x.symbol)}/`,'_blank','noopener,noreferrer');}}><span className="search-result-name"><strong>{x.symbol}</strong><span>{x.name}</span></span><small>{x.exchange}{!x.chartSymbol&&<span>Verify chart ↗</span>}</small></CommandItem>)}</CommandList></Command><p className="market-caption search-status" role="status">{status}</p></div>;
}
