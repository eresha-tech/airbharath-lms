// Test-only TypeScript loader; isolates repository modules per PostgreSQL connection.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const req = Module.createRequire(path.join(process.cwd(), 'package.json'));
function createLoader(overrides = {}) {
  const ts = req('typescript'), cache = new Map();
  function load(name) {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    let file = name.startsWith('@/') ? path.join(process.cwd(), name.slice(2)) : name;
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const mod = new Module(file); mod.filename = file; mod.paths = Module._nodeModulePaths(path.dirname(file)); cache.set(file, mod);
    mod.require = name => Object.hasOwn(overrides, name) ? overrides[name] : name.startsWith('@/') ? load(name) : name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : req(name);
    mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText, file);
    return mod.exports;
  }
  return load;
}
module.exports = { createLoader, req };
