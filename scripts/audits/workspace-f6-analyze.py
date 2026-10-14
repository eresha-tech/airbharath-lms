"""Catalog/source metadata analysis only. This script opens no database connection."""
from pathlib import Path
import json,re,collections,hashlib
root=Path.cwd();c=json.loads((root/'output/audits/workspace-f6/catalog-before.json').read_text());out={'foreignKeyIndexCoverage':[],'exactDuplicateCandidates':[],'defaultCollationIndexes':[],'functionSourceMatches':[]}
for fk in [k for k in c['constraints'] if k['type']=='f']:
 indexes=[i for i in c['indexes'] if i['schema']==fk['schema'] and i['table']==fk['table'] and i['valid'] and i['ready']]
 cols=fk['columns'];full=[];partial=[];prefix=[]
 for i in indexes:
  keys=[k.removesuffix(' DESC').removesuffix(' ASC').strip('"') for k in i['keys']]
  if len(keys)>=len(cols) and set(keys[:len(cols)])==set(cols):(partial if i['predicate'] else full).append(i['name'])
  elif keys and keys[0] in cols:prefix.append(i['name'])
 out['foreignKeyIndexCoverage'].append({'schema':fk['schema'],'table':fk['table'],'constraint':fk['name'],'columns':cols,'fullNonPartialPrefixIndexes':full,'partialFullPrefixIndexes':partial,'partialKeyPrefixIndexes':prefix,'covered':bool(full),'note':'Full-prefix coverage is conservative, not an instruction to add every uncovered index.'})
groups=collections.defaultdict(list)
for i in c['indexes']:
 key=(i['schema'],i['table'],i['method'],i['attribute_numbers'],str(i['predicate']),str(i['expressions']),i['unique'],i['key_count'],str(i['collations']))
 groups[key].append(i['name'])
 if 'default' in i['collations']:out['defaultCollationIndexes'].append({'schema':i['schema'],'table':i['table'],'name':i['name'],'unique':i['unique'],'keys':i['keys']})
out['exactDuplicateCandidates']=[{'schema':k[0],'table':k[1],'indexes':v} for k,v in groups.items() if len(v)>1]
latest={}
for entry in c['journal']:
 file=root/'drizzle'/f"{entry['tag']}.sql";sql=file.read_text()
 for match in re.finditer(r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:"?public"?\.)?"?(\w+)"?\s*\([^)]*\)[\s\S]*?\bAS\s+(\$\w*\$)([\s\S]*?)\2',sql,re.I):latest[match[1]]={'migration':file.name,'body':match[3].strip()}
for f in c['functions']:
 if f['schema']!='public':continue
 m=re.search(r'\bAS\s+(\$\w*\$)([\s\S]*?)\1',f['definition'],re.I);expected=latest.get(f['name']);actual=m[2].strip() if m else None
 out['functionSourceMatches'].append({'function':f['name'],'migration':expected['migration'] if expected else None,'bodyMatchesLatestReviewedMigration':expected is not None and expected['body']==actual})
out['limits']=['Composite equality prefixes may use a subset index; flags require workload/retention review.','Default-collation index candidates include text identifiers; a mismatch is not proof of data corruption.','Function-body comparison complements ledger/constraints; it does not claim production state.']
(root/'output/audits/workspace-f6/index-analysis.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'uncoveredFullFKPrefixes':sum(not k['covered'] for k in out['foreignKeyIndexCoverage']),'defaultCollationIndexes':len(out['defaultCollationIndexes']),'duplicateCandidates':len(out['exactDuplicateCandidates']),'publicFunctionBodiesMatched':sum(f['bodyMatchesLatestReviewedMigration'] for f in out['functionSourceMatches']),'unmatchedFunctionBodies':[f['function'] for f in out['functionSourceMatches'] if not f['bodyMatchesLatestReviewedMigration']]}))
# PostgreSQL truncates SQL identifiers at63 bytes; generated Drizzle FK names can exceed that.
snapshot=json.loads((root/'drizzle/meta/0029_snapshot.json').read_text());issues=[];tables=[];namingDrift=[];identifier=lambda x:x.encode()[:63].decode();norm=lambda x:x.replace(' ','');actions={'no action':'a','restrict':'r','cascade':'c','set null':'n','set default':'d'}
for key,table in snapshot['tables'].items():
 namespace=table['schema'] or 'public';name=table['name'];cols={x['name']:x for x in c['columns'] if x['schema']==namespace and x['table']==name};constraints={x['name']:x for x in c['constraints'] if x['schema']==namespace and x['table']==name};indexes={x['name']:x for x in c['indexes'] if x['schema']==namespace and x['table']==name}
 if set(cols)!=set(table['columns']):issues.append({'table':name,'issue':'column-set'})
 for column,expected in table['columns'].items():
  actual=cols.get(column)
  if actual is None or norm(actual['type'])!=norm(expected['type']) or actual['not_null']!=expected['notNull']:issues.append({'table':name,'column':column,'issue':'type/nullability'})
 for key,expected in table['foreignKeys'].items():
  actual=constraints.get(identifier(key))
  def same_fk(actual):return actual is not None and actual['columns']==expected['columnsFrom'] and actual['foreign_columns']==expected['columnsTo'] and actual['foreign_table']==expected['tableTo'] and actual['on_delete']==actions[expected['onDelete']] and actual['on_update']==actions[expected['onUpdate']]
  if actual is None:
   equivalents=[k for k in constraints.values() if k['type']=='f' and same_fk(k)]
   if len(equivalents)==1:
    actual=equivalents[0];namingDrift.append({'table':name,'expected':identifier(key),'actual':actual['name'],'semanticsMatch':True})
  if not same_fk(actual):issues.append({'table':name,'constraint':identifier(key),'issue':'FK definition'})
 for kind in ['uniqueConstraints','checkConstraints','compositePrimaryKeys']:
  for key in table[kind]:
   if identifier(key) not in constraints:issues.append({'table':name,'constraint':identifier(key),'issue':'missing '+kind})
 for key,index in table['indexes'].items():
  actual=indexes.get(identifier(key))
  if actual is None or actual['unique']!=index['isUnique']:issues.append({'table':name,'index':identifier(key),'issue':'missing/index uniqueness'})
 tables.append({'table':namespace+'.'+name,'columns':len(cols),'snapshotForeignKeys':len(table['foreignKeys']),'snapshotIndexes':len(table['indexes']),'snapshotChecks':len(table['checkConstraints'])})
comparison={'snapshot':'drizzle/meta/0029_snapshot.json','modeledPublicTables':len(tables),'tables':tables,'issues':issues,'foreignKeyNamingDrift':namingDrift,'extraPublicTables':['otps'],'otherTables':'Migration ledger and retained wsd1_clock test schema inventoried separately.','limits':'Whitespace-normalized types, column sets/nullability, FK keys/targets/actions and named unique/check/PK/index presence compared. Generated identifiers normalized to PostgreSQL63-byte limit. Defaults/full definitions retained in catalog; function bodies compared to last reviewed migration. No schema generation.'}
(root/'output/audits/workspace-f6/schema-comparison.json').write_text(json.dumps(comparison,indent=2)+'\n')
print(json.dumps({'snapshotTablesCompared':len(tables),'schemaIssues':issues,'foreignKeyNamingDriftCount':len(namingDrift)}))
coverage=[]
for table in [o for o in c['objects'] if o['schema']=='public' and o['name'].startswith('workspace_') and o['kind']=='r']:
 triggers=[t for t in c['triggers'] if t['schema']=='public' and t['table']==table['name']]
 coverage.append({'table':table['name'],'triggerNames':[t['name'] for t in triggers],'hasTruncateTrigger':any('TRUNCATE' in t['definition'] for t in triggers),'incomingForeignKeyCount':sum(k['type']=='f' and k['foreign_schema']=='public' and k['foreign_table']==table['name'] for k in c['constraints'])})
leaf_history=['workspace_audit_events','workspace_coupon_plans','workspace_coupon_redemptions','workspace_course_review_events','workspace_memberships','workspace_payment_attempts','workspace_payment_events']
critical={'finding':'F6-01 retained-history TRUNCATE guard gap','evidenceType':'Catalog and reviewed PostgreSQL semantics; no destructive command executed','leafHistoryTables':[x for x in coverage if x['table'] in leaf_history],'allWorkspaceCoverage':coverage,'auditStoppedForCorrectiveProposal':True,'noDataLossDemonstrated':True}
(root/'output/audits/workspace-f6/retention-guard-finding.json').write_text(json.dumps(critical,indent=2)+'\n')
