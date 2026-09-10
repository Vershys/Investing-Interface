import {z} from 'zod';
import {env} from 'cloudflare:workers';
import {actor,reply,failure,boundedJson} from '@/lib/agent/http';
import {runs} from '@/lib/agent/store';
import {runAssistant,dailyLimit} from '@/lib/agent/runner';
import {focusSchema} from '@/lib/agent/types';
import {database} from '@/db/store';
const schema=z.object({id:z.string().uuid(),threadId:z.string().uuid(),question:z.string().trim().min(1).max(4000),focus:focusSchema});
export async function GET(request:Request){try{const user=await actor();await database().prepare("UPDATE agent_runs SET status='interrupted',answer='This request stopped before completion. Any recorded tool actions are preserved. Start a new request to continue.',updated_at=? WHERE user_id=? AND status='running' AND updated_at<?").bind(new Date().toISOString(),user,new Date(Date.now()-300000).toISOString()).run();const thread=new URL(request.url).searchParams.get('thread')||undefined;const [history,budget,usage]=await Promise.all([runs(user,thread),database().prepare('SELECT reserved,calls FROM agent_budget WHERE user_id=? AND day=?').bind(user,new Date().toISOString().slice(0,10)).first(),database().prepare('SELECT COALESCE(SUM(input_tokens),0) AS inputTokens,COALESCE(SUM(output_tokens),0) AS outputTokens,COALESCE(SUM(cached_tokens),0) AS cachedTokens FROM agent_runs WHERE user_id=? AND created_at>=?').bind(user,new Date().toISOString().slice(0,10)).first()]);return reply({runs:history,budget:budget||{reserved:0,calls:0},usage,limit:dailyLimit(),configured:!!env.OPENAI_API_KEY,model:env.OPENAI_MODEL||'gpt-4.1-mini',marketConfigured:!!env.FINNHUB_API_KEY,schedulerConfigured:!!env.MONITOR_JOB_TOKEN});}catch(e){return failure(e);}}
export async function POST(request:Request){try{const user=await actor(request);const p=schema.parse(await boundedJson(request));return reply(await runAssistant(user,p.id,p.threadId,p.question,p.focus));}catch(e){return failure(e);}}
