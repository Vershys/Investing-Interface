// One wire schema for model output, persisted reports, import and rendering.
const str = {type:'string'};
const arr = items => ({type:'array',items});
const obj = properties => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const nullable = type => ({type:[type,'null']});
const choice = (...values) => ({type:'string',enum:values});
const refs = arr(str);
const evidence = {sourceIds:refs,locator:str};
export const reportSchema = obj({
  schemaVersion:{type:'string',enum:['1.0']},
  company:obj({ticker:str,exchange:str,name:str,cik:nullable('string'),businessModels:arr(str)}),
  asOf:str,summary:str,
  coverage:obj({status:choice('partial','comprehensive'),searchedThrough:str,limitations:arr(str)}),
  metrics:arr(obj({id:str,label:str,value:nullable('number'),unit:str,period:str,periodType:choice('annual','quarterly','ttm','snapshot'),scope:str,definition:str,kind:choice('reported','calculated','inferred'),availability:choice('available','not_disclosed','not_found','not_applicable'),calculation:str,...evidence})),
  subsidiaries:arr(obj({id:str,parentId:nullable('string'),name:str,entityType:choice('legal_entity','segment','brand','joint_venture'),role:str,dayToDay:str,products:arr(str),revenueSources:arr(str),revenue:nullable('number'),revenueUnit:str,revenuePeriod:str,president:nullable('string'),publicContact:nullable('string'),contactUrl:nullable('string'),disclosureStatus:str,...evidence})),
  revenueTypes:arr(obj({name:str,customerProblem:str,payer:str,pricing:str,recognition:str,segment:str,...evidence})),
  contracts:arr(obj({id:str,name:str,customer:str,awardDate:nullable('string'),status:str,value:nullable('number'),currency:str,valueBasis:choice('ceiling','funded_order','company_share','joint_venture_total','option','not_disclosed'),companyShare:nullable('number'),duration:str,scope:str,backlogTreatment:str,...evidence})),
  claims:arr(obj({id:str,category:choice('external_problem','internal_problem','competition','bottleneck','niche','investor_concern','catalyst','management_statement'),title:str,detail:str,kind:choice('reported','calculated','inferred'),counterEvidence:str,watchMetric:str,...evidence})),
  terms:arr(obj({term:str,companyDefinition:str,industryDifference:str,financialImplication:str,...evidence})),
  sources:arr(obj({id:str,title:str,url:str,publisher:str,publishedAt:nullable('string'),accessedAt:str,sourceType:choice('filing','earnings','presentation','company','government','news','other')}))
});
function check(schema,value,path='$') {
  if(schema.enum && !schema.enum.includes(value)) throw new Error(`${path}: invalid choice`);
  const types=Array.isArray(schema.type)?schema.type:[schema.type];
  const type=value===null?'null':Array.isArray(value)?'array':typeof value;
  if(!types.includes(type)) throw new Error(`${path}: expected ${types.join(' or ')}`);
  if(type==='number'&&!Number.isFinite(value))throw new Error(`${path}: non-finite number`);
  if(type==='string'&&value.length>30000)throw new Error(`${path}: text too long`);
  if(type==='array'){if(value.length>2000)throw new Error(`${path}: too many items`);value.forEach((v,i)=>check(schema.items,v,`${path}[${i}]`));}
  if(type==='object'){
    for(const k of schema.required)if(!Object.hasOwn(value,k))throw new Error(`${path}.${k}: required`);
    for(const k of Object.keys(value)){if(!Object.hasOwn(schema.properties,k))throw new Error(`${path}.${k}: unexpected`);check(schema.properties[k],value[k],`${path}.${k}`);}
  }
}
export function safeSourceUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function validateReport(report){
  check(reportSchema,report);
  if(!report.company.name.trim()||!report.company.ticker.trim()||!report.company.exchange.trim())throw new Error('Issuer identity is incomplete');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(report.asOf)||!Number.isFinite(Date.parse(report.asOf)))throw new Error('Invalid report date');
  const ids=new Set();
  for(const s of report.sources){if(!s.id||ids.has(s.id))throw new Error('Duplicate or empty source ID');ids.add(s.id);if(!safeSourceUrl(s.url))throw new Error('Unsafe source URL');}
  for(const group of ['metrics','subsidiaries','revenueTypes','contracts','claims','terms']){
    const recordIds=new Set();
    for(const row of report[group]){
      if(row.id!==undefined){if(!row.id||recordIds.has(row.id))throw new Error(`Duplicate ${group} ID`);recordIds.add(row.id);}
      if(row.sourceIds.some(id=>!ids.has(id)))throw new Error(`${group}: unresolved source reference`);
      if(row.sourceIds.length&&!row.locator.trim())throw new Error(`${group}: evidence locator required`);
      if(group==='metrics'){
        if((row.value!==null)!==(row.availability==='available'))throw new Error('Metric availability and value conflict');
        if(row.value!==null&&!row.sourceIds.length)throw new Error('Numeric metrics require evidence');
        if(row.kind==='calculated'&&!row.calculation.trim())throw new Error('Calculated metrics need a calculation');
        if(!row.period.trim()||!row.unit.trim()||!row.scope.trim()||!row.definition.trim())throw new Error('Metric context incomplete');
      }
      if(group==='subsidiaries'&&row.contactUrl&&!safeSourceUrl(row.contactUrl))throw new Error('Unsafe contact URL');
    }
  }
  const entities=new Map(report.subsidiaries.map(s=>[s.id,s]));
  for(const s of report.subsidiaries){const seen=new Set([s.id]);let p=s.parentId;while(p){if(seen.has(p)||!entities.has(p))throw new Error('Invalid subsidiary hierarchy');seen.add(p);p=entities.get(p).parentId;}}
  const warnings=['Source links and numerical consistency checks do not independently verify the underlying documents.'];
  for(const group of ['subsidiaries','revenueTypes','contracts','claims','terms'])if(report[group].some(r=>!r.sourceIds.length))warnings.push(`${group}: some entries have no source evidence.`);
  if(report.coverage.status==='partial')warnings.push('Research coverage is partial. Review the stated gaps.');
  if(!report.sources.length)warnings.push('No source documents were cited.');
  // Only reconcile truly comparable consolidated metrics; never guess definitions.
  for(const income of report.metrics.filter(m=>m.id.startsWith('operating_income')&&m.value!==null)){
    const peers=report.metrics.filter(m=>m.period===income.period&&m.periodType===income.periodType&&m.scope===income.scope&&m.unit===income.unit);
    const gross=peers.find(m=>m.id.startsWith('gross_profit')),cost=peers.find(m=>m.id.startsWith('operating_expenses'));
    if(gross?.value!=null&&cost?.value!=null&&Math.abs(gross.value-Math.abs(cost.value)-income.value)>Math.max(1,Math.abs(income.value)*.01))warnings.push(`Operating income does not reconcile for ${income.period}; inspect expense scope and signs.`);
  }
  return {report,warnings};
}
