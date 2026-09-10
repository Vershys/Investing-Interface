import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readExecutionProfile} from './execution-profile.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const children=[];let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const p of children)p.kill('SIGTERM');process.exitCode=code;}
function start(args){const p=spawn(process.execPath,args,{cwd:root,stdio:'inherit',env:{...process.env,BASTION_LOCAL_RESEARCH:'1'}});children.push(p);p.on('error',e=>{console.error(e.message);stop(1);});p.on('exit',code=>stop(code||0));return p;}
start(['services/research/server.mjs']);
const managed=readExecutionProfile()==='managed-linux';
const cli=managed?'node_modules/vite/bin/vite.js':'node_modules/vinext/dist/cli.js';
start([cli,'dev',managed?'--host':'--hostname','127.0.0.1','--port','4317',...(managed?['--strictPort']:[])]);
console.log('Bastion local: http://127.0.0.1:4317 — open Research desk. Reports stay on this computer; model research uses your cloud account.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop());
