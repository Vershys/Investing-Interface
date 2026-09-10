import {actor,reply,failure,boundedJson} from '@/lib/agent/http';
import {monitorState} from '@/lib/agent/store';
import {checkMonitor} from '@/lib/agent/monitor';
import {database} from '@/db/store';
import {z} from 'zod';
export async function GET(){try{return reply(await monitorState(await actor()));}catch(e){return failure(e);}}
export async function POST(request:Request){try{const user=await actor(request);const p=z.object({dismiss:z.string().uuid().optional()}).parse(await boundedJson(request));if(p.dismiss){await database().prepare("UPDATE monitor_events SET status='dismissed' WHERE id=? AND user_id=?").bind(p.dismiss,user).run();return reply({ok:true});}return reply(await checkMonitor(user));}catch(e){return failure(e);}}
