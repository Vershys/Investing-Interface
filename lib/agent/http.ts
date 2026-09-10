import {getChatGPTUser} from '@/app/chatgpt-auth';
import {AppError} from './store';
import {ZodError} from 'zod';
export async function actor(request?:Request){const user=await getChatGPTUser();if(!user)throw new AppError('Sign in to access your workspace.',401);if(request&&request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Invalid request origin.',403);return user.userId;}
export function reply(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function failure(e:unknown){if(e instanceof AppError)return reply({error:e.message},e.status);if(e instanceof ZodError)return reply({error:e.issues[0]?.message||'Check the supplied values.'},400);if(e instanceof SyntaxError)return reply({error:'Invalid request.'},400);console.error('Bastion request failed',e instanceof Error?e.name:'unknown');return reply({error:'Your workspace is temporarily unavailable. Your input has been preserved; please retry.'},503);}
export async function boundedJson(request:Request){const text=await request.text();if(text.length>24000)throw new AppError('This request is too large.',413);return JSON.parse(text);}
