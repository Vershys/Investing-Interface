export type SecurityResult={symbol:string;name:string;exchange:string;chartSymbol:string|null;source:string};
const clean=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
// A sorted token index supports prefix lookup without scanning the entire catalog.
export function createSymbolIndex(rows:SecurityResult[]){
 const entries=rows.flatMap((row,id)=>[...new Set([clean(row.symbol),...clean(row.name).split(' ')])].filter(Boolean).map(token=>({token,id})) ).sort((a,b)=>a.token.localeCompare(b.token,'en'));
 const compare=(a:string,b:string)=>a.localeCompare(b,'en');
 function prefix(word:string){let lo=0,hi=entries.length;while(lo<hi){const mid=(lo+hi)>>>1;if(compare(entries[mid].token,word)<0)lo=mid+1;else hi=mid;}const ids=new Set<number>();for(let i=lo;i<entries.length&&entries[i].token.startsWith(word);i++)ids.add(entries[i].id);return ids;}
 return (input:string,limit=20)=>{const words=clean(input).split(' ').filter(Boolean);if(!words.length)return [];let ids=prefix(words[0]);for(const word of words.slice(1)){const next=prefix(word);ids=new Set([...ids].filter(id=>next.has(id)));}const q=clean(input);return [...ids].map(id=>rows[id]).sort((a,b)=>{const score=(x:SecurityResult)=>clean(x.symbol)===q?0:clean(x.symbol).startsWith(q)?1:clean(x.name).startsWith(q)?2:3;return score(a)-score(b)||a.symbol.localeCompare(b.symbol);}).slice(0,limit);};
}
