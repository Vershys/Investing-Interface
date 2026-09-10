import {actor,reply,failure,boundedJson} from '@/lib/agent/http';
import {listRecords,saveRecord,history} from '@/lib/agent/store';
export async function GET(request:Request){try{const user=await actor();const id=new URL(request.url).searchParams.get('history');return reply(id?{history:await history(user,id)}:{records:await listRecords(user)});}catch(e){return failure(e);}}
export async function POST(request:Request){try{return reply({record:await saveRecord(await actor(request),await boundedJson(request))});}catch(e){return failure(e);}}
