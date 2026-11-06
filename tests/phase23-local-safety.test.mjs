import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const file of ['scripts/phase23-isolated-postgres.cjs','scripts/phase23-local-test.cjs'])test(file+' refuses startup without dedicated synthetic-test authorization',()=>{
 const result=spawnSync(process.execPath,[file],{env:{PATH:process.env.PATH,HOME:process.env.HOME,DATABASE_ENV:'production'},encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Phase23 isolated-test|PHASE23_LOCAL_TEST=true required/);
});
