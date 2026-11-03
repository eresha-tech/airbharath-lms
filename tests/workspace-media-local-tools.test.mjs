import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const safe={PATH:process.env.PATH,HOME:process.env.HOME,DATABASE_ENV:'production',NODE_ENV:'production'};
test('media dev command refuses additional flags before starting any server',()=>{const r=spawnSync(process.execPath,['scripts/dev.mjs','--media','--port','3001'],{env:safe,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/without additional flags/);});
test('local founder browser requires explicit CLI opt-in before database/session use',()=>{const r=spawnSync(process.execPath,['scripts/workspace-media-open-browser.cjs'],{env:safe,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/refused\/failed/);assert.doesNotMatch(r.stderr,/Bearer|ab_session|eyJ/);});
test('local migration refuses production classification before connecting',()=>{const r=spawnSync(process.execPath,['scripts/workspace-media-local-migrate.cjs'],{env:{...safe,ALLOW_DATABASE_MIGRATION:'true'},encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/Local migration refused/);});
test('local synthetic setup refuses production classification before inserting users',()=>{const r=spawnSync(process.execPath,['scripts/workspace-media-local-setup.cjs'],{env:{...safe,ALLOW_DESTRUCTIVE_DB_OPERATION:'true'},encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/failed at target/);});
