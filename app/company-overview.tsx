'use client';
import {useState} from 'react';
import {ArrowRight,ExternalLink} from 'lucide-react';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {financialGroups,financialAxis} from '@/lib/research/visuals.mjs';
import {safeSourceUrl} from '@/lib/research/schema.mjs';
import type {Report,Metric,Evidence} from '@/lib/research/types';
type Detail={title:string;text:string;evidence:Evidence;metric?:Metric};
const fields=[['sector','Sector'],['industry','Industry'],['ceo','CEO'],['website','Website'],['headquarters','Headquarters'],['founded','Founded'],['ipoDate','IPO date'],['identifiers','Identifiers'],['cfi','CFI code']];
const number=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
export function CompanyOverview({report,onDetail,onFinancials}:{report:Report;onDetail:(detail:Detail)=>void;onFinancials:()=>void}){
 const [expanded,setExpanded]=useState(false),[periodType,setPeriodType]=useState(()=>financialGroups(report.metrics).some((g:{periodType:string})=>g.periodType==='annual')?'annual':financialGroups(report.metrics).some((g:{periodType:string})=>g.periodType==='quarterly')?'quarterly':'annual'),[groupKey,setGroupKey]=useState('');
 const groups=financialGroups(report.metrics).filter((g:{periodType:string})=>g.periodType===periodType);
 const group=groups.find((g:{key:string})=>g.key===groupKey)||groups[0];
 const metrics:Metric[]=group?.metrics||[];
 const axis=financialAxis(metrics);
 const inspect=(m:Metric)=>onDetail({title:m.label,text:m.definition,evidence:m,metric:m});
 return <div className="company-overview">
 <h2>Company info</h2><div className="company-info-grid">{fields.map(([key,label])=>{
 const fact=report.companyInfo?.find(f=>f.key===key);const value=fact?.value;
 return <div className="company-info-field" key={key}><span>{label}</span>{value&&fact?<div><button onClick={()=>onDetail({title:label,text:value,evidence:fact})}>{value}<ArrowRight size={14}/></button>{key==='website'&&safeSourceUrl(value)&&<a aria-label="Open company website in a new tab" href={value} target="_blank" rel="noreferrer"><ExternalLink size={14}/></a>}</div>:<button className="company-info-missing" onClick={()=>onDetail({title:label,text:fact?.locator||'This field was not established by the research run.',evidence:fact||{sourceIds:[],locator:'No source evidence supplied.'}})}>Not established <ArrowRight size={14}/></button>}</div>;
 })}</div>
 {!report.companyInfo&&<p className="muted company-legacy">This saved report predates company-info fields. A new snapshot can populate them; opening this page does not start research.</p>}
 <div className="company-description"><p className={expanded?'':'company-description-clamped'}>{report.summary}</p>{report.summary.length>0&&<button className="text-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Show less':'Show more'}</button>}</div>
 <section className="overview-financials"><div className="section-title"><button className="text-button" onClick={onFinancials}><h2>Financials</h2><ArrowRight size={18}/></button><div className="financial-periods" aria-label="Financial period type">{['annual','quarterly'].map(type=><button key={type} aria-pressed={periodType===type} onClick={()=>{setPeriodType(type);setGroupKey('');}}>{type==='annual'?'Annual':'Quarterly'}</button>)}</div></div>
 {group?<><Select value={group.key} onValueChange={setGroupKey}><SelectTrigger className="financial-group-select" aria-label="Financial period and scope"><SelectValue/></SelectTrigger><SelectContent>{groups.map((g:{key:string;period:string;scope:string;unit:string})=><SelectItem key={g.key} value={g.key}>{g.period} · {g.scope} · {g.unit}</SelectItem>)}</SelectContent></Select>
 <div className="financial-visual-grid"><div className="financial-bars"><h3>Reported performance</h3><p className="muted">{group.period} · {group.scope} · {group.unit}</p><div className="financial-axis" aria-hidden="true"><span>{number(axis.min)}</span><span>{number(axis.max)}</span></div>
 {metrics.map(m=>{const end=axis.position(m.value!);return <button className="financial-bar-row" key={m.id} onClick={()=>inspect(m)} aria-label={`${m.label}: ${number(m.value!)} ${m.unit}. Open definition and sources.`}><span><strong>{m.label}</strong><span>{number(m.value!)} <ArrowRight size={13}/></span></span><span className="financial-bar-track" aria-hidden="true"><i className="financial-zero" style={{left:`${axis.zero}%`}}/><i className={m.value!<0?'financial-bar-negative':'financial-bar-positive'} style={{left:`${Math.min(axis.zero,end)}%`,width:`${Math.abs(end-axis.zero)}%`}}/></span></button>;})}
 <p className="financial-chart-note">Bars share one linear scale. Negative values extend left of zero. Click any figure for its exact value, definition and evidence.</p></div>
 <div className="financial-values"><h3>Figures & definitions</h3>{metrics.map(m=><details key={m.id}><summary><span>{m.label}</span><strong>{number(m.value!)} <small>{m.unit}</small></strong></summary><p>{m.definition}</p><p className="muted">{m.period} · {m.scope}</p><button className="text-button" onClick={()=>inspect(m)}>View {m.sourceIds.length} source references <ArrowRight size={14}/></button></details>)}</div></div>
 <p className="financial-chart-note">Only sourced, reported figures with the same period, scope and unit are plotted together. Definitions may differ; no profit-conversion waterfall or historical values are inferred.</p></>:<div className="financial-empty"><h3>No comparable {periodType} figures available</h3><p>{report.metrics.filter(m=>m.periodType===periodType&&m.value!==null).length} numeric {periodType} records are saved, but none qualify for this performance chart. {report.metrics.filter(m=>m.value!==null).length} numeric records are available across all period types in the Financials tab.</p><button className="text-button" onClick={onFinancials}>Open financial data <ArrowRight size={14}/></button></div>}
 <details className="financial-values"><summary>All saved financial figures · {report.metrics.length}</summary>{report.metrics.length?report.metrics.map(m=><button key={m.id} className="source-row" onClick={()=>inspect(m)}><span>{m.label}<small className="rd-block">{m.periodType} · {m.period} · {m.scope}</small></span><strong>{m.value===null?'Not established':number(m.value)+' '+m.unit}</strong><ArrowRight size={14}/></button>):<p>No financial records were collected in this run.</p>}</details>
 <details className="rd-coverage"><summary>Research gaps and unresolved fields · {report.coverage.limitations.length}</summary><ul>{report.coverage.limitations.map((text,i)=><li key={i}>{text}</li>)}</ul></details>
 </section></div>;
}
