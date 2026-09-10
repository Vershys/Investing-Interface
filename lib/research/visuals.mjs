// Exact grouping only: never merge currencies, scales, scopes or period types.
export function financialGroups(metrics){
 const groups=new Map();
 for(const metric of metrics){
  if(metric.value===null||!Number.isFinite(metric.value)||metric.kind!=='reported'||!metric.sourceIds.length)continue;
  if(!/^(revenue|net.sales|gross.profit|operating.income|operating.loss|net.income|net.loss)(?:\b|_)/i.test(metric.id+' '+metric.label))continue;
  if(/percent|%|margin|per.share|eps|ratio/i.test(metric.unit+' '+metric.label))continue;
  if(!/USD|EUR|GBP|JPY|CAD|AUD|CNY|CHF|dollar|euro|pound/i.test(metric.unit))continue;
  const key=JSON.stringify([metric.periodType,metric.period,metric.scope,metric.unit]);
  if(!groups.has(key))groups.set(key,{key,period:metric.period,periodType:metric.periodType,scope:metric.scope,unit:metric.unit,metrics:[]});
  groups.get(key).metrics.push(metric);
 }
 return [...groups.values()];
}
export function financialAxis(metrics){
 const min=Math.min(0,...metrics.map(m=>m.value)),max=Math.max(0,...metrics.map(m=>m.value));
 const span=max-min||1;return {min,max,zero:(0-min)/span*100,position:value=>(value-min)/span*100};
}
