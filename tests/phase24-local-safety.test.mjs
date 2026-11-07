import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const file of ['scripts/phase24-isolated-postgres.cjs','scripts/phase24-local-test.cjs','scripts/phase24-open-browser.cjs','scripts/phase24-build.cjs'])test(file+' refuses startup without dedicated synthetic authorization',()=>{
 const r=spawnSync(process.execPath,[file],{env:{PATH:process.env.PATH,HOME:process.env.HOME,DATABASE_ENV:'production'},encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/Phase24 isolated-test|PHASE24_(?:LOCAL_TEST|OPEN_BROWSER|BUILD)=true required/);
});
