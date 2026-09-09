export type Holding = { ticker: string; name: string; sector: string; shares: number; price: number; cost: number; change: number; color: string; thesis: string; question: string };
export const holdings: Holding[] = [
 {ticker:'APH',name:'Amphenol',sector:'Connectivity',shares:140,price:124.80,cost:106.40,change:1.84,color:'#b9c997',thesis:'Infrastructure demand supports connector growth.',question:'Is organic growth keeping pace with acquisition-led expansion?'},
 {ticker:'LUMN',name:'Lumen Technologies',sector:'Digital infrastructure',shares:1450,price:6.64,cost:5.82,change:-1.19,color:'#8ca5b5',thesis:'Strategic services eventually offset legacy decline.',question:'How much announced contract value converts into recurring cash flow?'},
 {ticker:'ET',name:'Energy Transfer',sector:'Energy infrastructure',shares:520,price:17.42,cost:16.10,change:0.58,color:'#bca37b',thesis:'Contracted infrastructure supports durable distributions.',question:'How much distributable cash remains after maintenance and growth spending?'},
 {ticker:'CTM',name:'Castellum',sector:'Defense services',shares:1800,price:1.38,cost:1.52,change:-2.13,color:'#a3aab4',thesis:'Funded task orders translate into profitable growth.',question:'Which awards are funded commitments versus contract ceilings?'},
 {ticker:'NVEC',name:'NVE Corporation',sector:'Semiconductors',shares:65,price:78.35,cost:74.20,change:0.92,color:'#7da995',thesis:'Specialized spintronics retains pricing power.',question:'Are customer orders recovering alongside sustainable margins?'},
];
export const CASH=4280.50;
export const money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(v);
export const signed=(v:number)=>`${v>=0?'+':'−'}${money(Math.abs(v))}`;
export const pct=(v:number)=>`${v>=0?'+':'−'}${Math.abs(v).toFixed(2)}%`;
export const equity=(h:Holding)=>h.shares*h.price;
export const dayContribution=(h:Holding)=>h.shares*(h.price-h.price/(1+h.change/100));
export const portfolioValue=holdings.reduce((s,h)=>s+equity(h),CASH);
export const portfolioChange=holdings.reduce((s,h)=>s+dayContribution(h),0);
export const ranges=['1D','1W','1M','3M','YTD','1Y','ALL'] as const;
export type Range=typeof ranges[number];
// Entire history is deterministic synthetic demo data, not reconstructed brokerage history.
export function series(end:number,range:Range,seed=0,dailyChange=1) {
 const gains:Record<Range,number>={'1D':dailyChange,'1W':2.4+seed*.15,'1M':6.3+seed*.4,'3M':10.2+seed*.7,'YTD':15.4+seed,'1Y':21.3+seed,'ALL':29.5+seed};
 const gain=gains[range];const start=end/(1+gain/100);const n=range==='1D'?79:65;
 const span:Record<Range,number>={'1D':0,'1W':7,'1M':30,'3M':90,'YTD':251,'1Y':365,'ALL':730};
 return Array.from({length:n},(_,i)=>{const t=i/(n-1); const noise=(Math.sin(i*1.7+seed)*.003+Math.sin(i*.47+seed)*.009)*Math.sin(Math.PI*t); const value=start+(end-start)*t+end*noise; const date=new Date(Date.UTC(2026,8,9)-span[range]*86400000*(1-t));const label=range==='1D'?`${String(9+Math.floor((30+390*t)/60)).padStart(2,'0')}:${String(Math.floor((30+390*t)%60)).padStart(2,'0')}`:date.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});return {label,value:+value.toFixed(2),benchmark:+(start*(1+.065*t+Math.sin(i*.4)*.002*Math.sin(Math.PI*t))).toFixed(2),index:i};});
}
export function scenarioValue(ebitda:number,multiple:number,netDebt:number,shares:number){if(![ebitda,multiple,netDebt,shares].every(Number.isFinite)||shares<=0) throw new Error('Invalid scenario inputs');return Math.max(0,(ebitda*multiple-netDebt)/shares);}
