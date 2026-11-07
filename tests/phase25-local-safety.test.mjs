import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
for(const file of ['scripts/phase25-isolated-postgres.cjs','scripts/phase25-local-test.cjs','scripts/phase25-open-browser.cjs','scripts/phase25-build.cjs'])test(`${file} refuses missing acknowledgement before fixture access`,()=>{const r=spawnSync(process.execPath,[file],{env:{PATH:process.env.PATH,HOME:process.env.HOME},encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/Phase25 isolated-test|PHASE25_(?:LOCAL_TEST|OPEN_BROWSER|BUILD)=true required/);});
