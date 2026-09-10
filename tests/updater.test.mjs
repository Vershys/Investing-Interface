import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {git,update} from '../scripts/update-and-start.mjs';
test('updater fast-forwards and preserves local changes and diverging history',()=>{
  const dir=mkdtempSync(join(tmpdir(),'bastion-update-'));
  try {
    const remote=join(dir,'remote.git'),source=join(dir,'source'),client=join(dir,'client');
    git(dir,['init','--bare',remote]);git(dir,['init','-b','main',source]);
    git(source,['config','user.email','test@example.invalid']);git(source,['config','user.name','Test']);
    writeFileSync(join(source,'app.txt'),'one');git(source,['add','.']);git(source,['commit','-m','initial']);
    git(source,['remote','add','origin',remote]);git(source,['push','-u','origin','main']);
    git(dir,['clone','--branch','main',remote,client]);
    assert.equal(update(client,remote),false);
    writeFileSync(join(source,'app.txt'),'two');git(source,['commit','-am','update']);git(source,['push']);
    assert.equal(update(client,remote),true);assert.equal(readFileSync(join(client,'app.txt'),'utf8'),'two');
    writeFileSync(join(client,'app.txt'),'personal edit');
    assert.throws(()=>update(client,remote),/local code changes/);
    assert.equal(readFileSync(join(client,'app.txt'),'utf8'),'personal edit');
    git(client,['config','user.email','test@example.invalid']);git(client,['config','user.name','Test']);
    git(client,['commit','-am','local branch work']);
    assert.throws(()=>update(client,remote),/history differs/);
    assert.throws(()=>update(client,'https://wrong.example/repo.git'),/source has changed/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
