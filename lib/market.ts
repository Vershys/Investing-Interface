export const marketSymbols = [
  {symbol:'NASDAQ:AAPL',name:'Apple'}, {symbol:'NASDAQ:NVDA',name:'NVIDIA'},
  {symbol:'NASDAQ:MSFT',name:'Microsoft'}, {symbol:'NASDAQ:AMZN',name:'Amazon'},
  {symbol:'NASDAQ:GOOGL',name:'Alphabet'}, {symbol:'NASDAQ:TSLA',name:'Tesla'},
  {symbol:'NASDAQ:PLTR',name:'Palantir'}, {symbol:'NYSE:LUMN',name:'Lumen'},
  {symbol:'NYSE:APH',name:'Amphenol'}, {symbol:'NYSE:ET',name:'Energy Transfer'},
  {symbol:'AMEX:CTM',name:'Castellum'}, {symbol:'NASDAQ:NVEC',name:'NVE'},
];
export function normalizeSymbol(input:string):string|null {
 const value=input.trim().toUpperCase();
 if(!/^(?:(?:NASDAQ|NYSE|AMEX):)?[A-Z][A-Z0-9.\-]{0,9}$/.test(value))return null;
 return marketSymbols.find(x=>x.symbol.split(':')[1]===value)?.symbol ?? value;
}
export function brokerUrl(symbol:string):string {
 const valid=normalizeSymbol(symbol);if(!valid)throw new Error('Invalid US stock symbol');
 return `https://robinhood.com/us/en/stocks/${encodeURIComponent(valid.split(':').at(-1)!)}/`;
}
export function providerUrl(symbol:string){return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;}
