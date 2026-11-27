// Reuse the reviewed synthetic financial foundation, with its own Stage2A paths.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
assert.equal(process.env.STAGE2A_ISOLATED_VERIFY,'true');assert.equal(process.env.DATABASE_URL,undefined);
process.env.PHASE25A_ISOLATED_VERIFY='true';
const file=path.join(__dirname,'phase25a-isolated-postgres.cjs');let code=fs.readFileSync(file,'utf8');
code=code.replaceAll('/tmp/airbharath-phase25a','/tmp/airbharath-stage2a').replaceAll('workspace-phase25a','workspace-stage2a').replace('assert.equal(count,44)','assert.equal(count,45)').replaceAll('n,44)','n,45)');
assert(code.includes('assert.equal(count,45)'));const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(__dirname);m._compile(code,file);
