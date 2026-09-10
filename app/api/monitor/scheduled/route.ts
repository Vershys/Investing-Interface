import {env} from 'cloudflare:workers';
import {actor,reply,failure} from '@/lib/agent/http';
import {AppError} from '@/lib/agent/store';
import {checkMonitor} from '@/lib/agent/monitor';
// Scheduler must authenticate through the private Site dispatcher as well as
// supply the application job token. No arbitrary user-id impersonation.
export async function POST(request:Request){try{if(!env.MONITOR_JOB_TOKEN||request.headers.get('Authorization')!==`Bearer ${env.MONITOR_JOB_TOKEN}`)throw new AppError('Unauthorized job.',401);return reply(await checkMonitor(await actor()));}catch(e){return failure(e);}}
