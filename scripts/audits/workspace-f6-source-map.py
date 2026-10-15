"""F.6 metadata-only source dependency/provenance scan; never loads credentials."""
from pathlib import Path
import json,re,subprocess
root=Path.cwd();schema=root/'lib/db/schema.ts';text=schema.read_text();symbols={table:symbol for symbol,table in re.findall(r"export const (\w+)\s*=\s*pgTable\('([^']+)'",text)}
symbols.setdefault('otps',None);symbols.setdefault('__drizzle_migrations',None)
files=[Path(p) for p in subprocess.check_output(['git','ls-files','-z']).decode().split('\0') if p and Path(p).suffix in {'.ts','.tsx','.js','.mjs','.cjs','.sql'} and not p.startswith(('output/','.env','.next/','node_modules/'))]
source={}
for table,symbol in symbols.items():
 entries={k:[] for k in ['runtime','scripts','tests','migrations','schema','legacy_artifacts']}
 pattern=re.compile(r'(?<![\w])(?:'+re.escape(table)+'|'+re.escape(symbol or table)+r')(?![\w])')
 for file in files:
  category='schema' if str(file)=='lib/db/schema.ts' else 'runtime' if str(file).startswith(('app/','lib/','components/')) else 'tests' if str(file).startswith('tests/') else 'migrations' if str(file).startswith('drizzle/') else 'scripts' if str(file).startswith('scripts/') else 'legacy_artifacts'
  for n,line in enumerate(file.read_text().splitlines(),1):
   if pattern.search(line):entries[category].append({'file':str(file),'line':n})
 introductions=[];mentions=[]
 for file in sorted((root/'drizzle').glob('*.sql')):
  sql=file.read_text()
  if re.search(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?'+re.escape(table)+r'"?(?=\s|\()',sql,re.I):introductions.append(file.name)
  if re.search(r'\b'+re.escape(table)+r'\b',sql):mentions.append(file.name)
 source[table]={'symbol':symbol,'declaredInDrizzle':symbol is not None,'introductionMigrations':introductions,'migrationMentions':mentions,'references':entries,'runtimeFiles':sorted(set(e['file'] for e in entries['runtime']))}
out=root/'output/audits/workspace-f6/source-map.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps({'tables':source,'trackedFilesScanned':len(files),'limits':'Lexical symbol/physical-name evidence; aliases, indirect calls and dynamic trigger paths reviewed separately. Schema declarations alone are not counted as active runtime use.'},indent=2)+'\n')
print(json.dumps({'declaredTables':sum(x['declaredInDrizzle'] for x in source.values()),'additionalPhysicalObjectsScanned':sum(not x['declaredInDrizzle'] for x in source.values()),'trackedFilesScanned':len(files),'noRuntimeReferences':[t for t,x in source.items() if not x['runtimeFiles']]}))
