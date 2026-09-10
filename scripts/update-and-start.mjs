import {spawn, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join, resolve} from 'node:path';
import {createConnection} from 'node:net';

export const repository = 'https://github.com/Vershys/Investing-Interface.git';
const root = fileURLToPath(new URL('../', import.meta.url));
export function git(cwd, args) {
  const result = spawnSync('git', args, {cwd, encoding:'utf8', windowsHide:true});
  if (result.error || result.status !== 0) throw new Error(result.stderr?.trim() || result.error?.message || 'Git operation failed.');
  return result.stdout.trim();
}
export function update(cwd, expectedRemote = repository) {
  if (git(cwd, ['remote','get-url','origin']) !== expectedRemote) throw new Error('The update source has changed. Ask ChatGPT to check it before continuing.');
  if (git(cwd, ['branch','--show-current']) !== 'main') throw new Error('This copy is not on the main update branch. No files were replaced.');
  if (git(cwd, ['status','--porcelain','--untracked-files=all'])) throw new Error('This copy has local code changes. No files were replaced. Ask ChatGPT to preserve and reconcile your edits.');
  git(cwd, ['fetch','--no-tags','origin','refs/heads/main']);
  const target = git(cwd, ['rev-parse','FETCH_HEAD']);
  const before = git(cwd, ['rev-parse','HEAD']);
  if (before === target) return false;
  const ancestor = spawnSync('git',['merge-base','--is-ancestor','HEAD',target],{cwd});
  if (ancestor.status !== 0) throw new Error('Local history differs from the update source. No files were replaced.');
  git(cwd, ['merge','--ff-only',target]);
  return true;
}
function portInUse(port) {
  return new Promise(resolvePort => {
    const socket = createConnection({host:'127.0.0.1',port});
    const finish = used => { socket.destroy(); resolvePort(used); };
    socket.setTimeout(1000,()=>finish(false));
    socket.once('connect',()=>finish(true));
    socket.once('error',()=>finish(false));
  });
}
export function dependencyStamp(cwd) {
  return createHash('sha256').update(readFileSync(join(cwd,'package-lock.json')))
    .update(readFileSync(join(cwd,'package.json'))).update(process.versions.node).digest('hex');
}
function npmInstall(cwd) {
  // npm.cmd cannot be spawned directly by Node on Windows. Only this fixed
  // command goes through cmd.exe; no paths, credentials or user text are interpolated.
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32' ? ['/d','/c','npm ci'] : ['ci'];
  const result = spawnSync(command,args,{cwd,stdio:'inherit'});
  if (result.error || result.status !== 0) throw new Error('Dependency installation failed. Run Start Bastion again to retry.');
}
async function main() {
  const [major,minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13)) throw new Error('Node.js 22.13 or newer is required.');
  if ((await Promise.all([portInUse(4317),portInUse(4319)])).some(Boolean)) throw new Error('Bastion or another program is already using its ports. Close the old Bastion command window before updating.');
  // OS-released lock: a second launcher cannot update files during a running session.
  const {createServer} = await import('node:net');
  const lock = createServer();
  await new Promise((ok,fail) => {lock.once('error',()=>fail(new Error('Another Bastion launcher is open. Close it before continuing.')));lock.listen(4320,'127.0.0.1',ok);});
  try {
    console.log('Checking for Bastion updates...');
    console.log(update(root) ? 'Bastion updated.' : 'Bastion is up to date.');
    const receipt = join(root,'.git','bastion-dependencies');
    const stamp = dependencyStamp(root);
    if (!existsSync(join(root,'node_modules')) || !existsSync(receipt) || readFileSync(receipt,'utf8') !== stamp) {
      console.log('Installing application dependencies...');
      npmInstall(root);
      writeFileSync(receipt,stamp);
    }
    // Run the refreshed launcher in a new process so updates take effect now.
    const child = spawn(process.execPath,['scripts/start-local-research.mjs'],{cwd:root,stdio:'inherit',env:process.env});
    let exited = false, opened = false;
    child.once('exit',()=>{exited=true;});
    const poll = setInterval(async()=>{
      if (exited || opened) return;
      try {
        const r = await fetch('http://127.0.0.1:4317',{signal:AbortSignal.timeout(1500)});
        if (!r.ok || exited || opened) return;
        opened = true;
        clearInterval(poll);
        if (process.platform === 'win32') {
          // Let Windows open the URL directly. Passing START's empty title
          // through Node/cmd quoting can make Windows try to open a backslash.
          const opener=spawn('explorer.exe',['http://127.0.0.1:4317'],{stdio:'ignore'});
          opener.on('error',()=>console.log('Open http://127.0.0.1:4317 in your browser.'));
        } else console.log('Open http://127.0.0.1:4317 in your browser.');
      } catch { /* Keep checking while the first development build finishes. */ }
    },2000);
    const stop = () => child.kill('SIGTERM');
    process.once('SIGINT',stop); process.once('SIGTERM',stop);
    console.log('Starting Bastion. Keep this window open while using research.');
    try {
      await new Promise((ok,fail)=>{child.once('error',fail);child.once('exit',code=>code ? fail(new Error('Bastion stopped with an error.')) : ok());});
    } finally {clearInterval(poll);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
  } finally {lock.close();}
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error=>{console.error('\n'+error.message);process.exitCode=1;});
}
