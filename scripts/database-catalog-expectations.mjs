import {createHash} from 'node:crypto';
const hash=body=>createHash('sha256').update(body.replaceAll('\r\n','\n').trim()).digest('hex');
export const signature=args=>args.split(',').map(s=>s.trim().replace(/\s+DEFAULT\s+[\s\S]*/i,'').replace(/\s+/g,' ')).join(', ');
export const triggerDefinition=value=>value.replace(/;$/, '').replaceAll('\"','').replace(/\bpublic\./g,'').replace(/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)(?: OR (?:INSERT|UPDATE|DELETE|TRUNCATE))+/g,s=>s.split(' OR ').sort().join(' OR ')).replace(/,\s*/g,', ').replace(/\s+/g,' ').trim();
export const routineAttributes=value=>{
 const a=value.split(/\bAS\s+\$/i)[0],args=/CREATE(?: OR REPLACE)? FUNCTION\s+(?:public\.)?\w+\s*\(([^)]*)\)/i.exec(a)?.[1]??'';return {defaults:args.split(',').filter(s=>/\bDEFAULT\b/i.test(s)).map(s=>s.trim().replace(/\s+/g,' ').replace(/^(\w+\s+(\w+)\s+DEFAULT NULL)::\2$/i,'$1')),returns:/RETURNS\s+([\s\S]*?)\s+LANGUAGE\b/i.exec(a)?.[1].replaceAll('\"','').replace(/\s+/g,' ').replace(/\(\s*/g,'(').replace(/\s*\)/g,')').replace(/,\s*/g,', ').trim().toLowerCase(),configuration:[...a.matchAll(/\bSET\s+([^\n]+)/gi)].map(m=>m[1].trim().replace(/^search_path\s*(?:=|TO)\s*'?pg_catalog'?$/i,'search_path=pg_catalog')),volatility:/\b(IMMUTABLE|STABLE)\b/i.exec(a)?.[1].toUpperCase()??'VOLATILE',strict:/\bSTRICT\b|RETURNS NULL ON NULL INPUT/i.test(a),parallel:/PARALLEL\s+(SAFE|RESTRICTED)/i.exec(a)?.[1].toUpperCase()??'UNSAFE'};
};
export function expectedRoutines(migrations){
 const functions=new Map(),triggers=new Map();
 for(const m of migrations){
  // Remove complete dollar-quoted routine bodies before parsing top-level DDL.
  let ddl=m.sql.replace(/CREATE(?: OR REPLACE)? FUNCTION\s+(?:public\.)?(\w+)\s*\(([^)]*)\)([\s\S]*?)\bAS\s+(\$\w*\$)([\s\S]*?)\4\s*;/gi,(_,name,args,attributes,delimiter,body)=>{
   const arguments_=signature(args),key=name+'('+arguments_+')';
   functions.set(key,{name,arguments:arguments_,hash:hash(body),attributes:routineAttributes('CREATE FUNCTION '+name+'('+args+') '+attributes),language:/LANGUAGE\s+(\w+)/i.exec(attributes)?.[1].toLowerCase()});return '';
  });
  // The five reviewed 0034 loops use literal table arrays and one %I identifier.
  // Do not evaluate arbitrary SQL, interpolate target metadata or infer new names.
  ddl=ddl.replace(/FOREACH\s+(\w+)\s+IN ARRAY ARRAY\[([^\]]+)\]\s+LOOP([\s\S]*?)END LOOP;/gi,(_,variable,list,body)=>{
   if(!/^\s*'\w+'(?:\s*,\s*'\w+')*\s*$/.test(list))return '';
   const match=new RegExp("EXECUTE format\\('([^']*)',\\s*"+variable+"\\)\\s*;",'i').exec(body);
   if(!match||match[1].split('%I').length!==2||/%[^I]/.test(match[1]))return '';
   return [...list.matchAll(/'(\w+)'/g)].map(m=>match[1].replace('%I',m[1])+';').join('\n');
  });
  const changes=/DROP TRIGGER\s+(\w+)\s+ON\s+(?:public\.)?(\w+)\s*;|CREATE( CONSTRAINT)? TRIGGER\s+(\w+)\s+([^;]+?)\s+ON\s+(?:public\.)?(\w+)\s+([^;]+?)EXECUTE FUNCTION\s+(?:public\.)?(\w+)\(\)\s*;/gi;
  for(const r of ddl.matchAll(changes)){
   if(r[1]){triggers.delete(r[2]+'.'+r[1]);continue;}
   const clause=r[5],tail=r[7],type=(/FOR EACH ROW/i.test(tail)?1:0)+(/BEFORE/i.test(clause)?2:0)+(/INSERT/i.test(clause)?4:0)+(/DELETE/i.test(clause)?8:0)+(/UPDATE/i.test(clause)?16:0)+(/TRUNCATE/i.test(clause)?32:0);
   triggers.set(r[6]+'.'+r[4],{definition:triggerDefinition(r[0]),function:r[8],type,deferrable:/\bDEFERRABLE\b/i.test(tail),deferred:/INITIALLY DEFERRED/i.test(tail)});
  }
 }
 return{functions,triggers};
}
// These nine hand-written migration indexes are absent from Drizzle snapshots.
// Exact PostgreSQL 16 renderings were individually compared to the cited SQL;
// names alone never satisfy the check. No target-derived expectation loading.
const indexes=[
 ['0034','workspace_publication_prices','workspace_one_pending_price',"CREATE UNIQUE INDEX workspace_one_pending_price ON public.workspace_publication_prices USING btree (project_id) WHERE (status = 'proposed'::text)"],
 ['0036','course_reviews','course_reviews_moderation_idx','CREATE INDEX course_reviews_moderation_idx ON public.course_reviews USING btree (status, updated_at, id)'],
 ['0036','modules','modules_discovery_course_idx','CREATE INDEX modules_discovery_course_idx ON public.modules USING btree (course_id) WHERE (NOT workspace_retired)'],
 ['0036','lessons','lessons_discovery_module_idx','CREATE INDEX lessons_discovery_module_idx ON public.lessons USING btree (module_id) WHERE (NOT workspace_retired)'],
 ['0036','enrollments','enrollments_discovery_course_idx','CREATE INDEX enrollments_discovery_course_idx ON public.enrollments USING btree (course_id, user_id)'],
 ['0036','courses','courses_discovery_filters_idx','CREATE INDEX courses_discovery_filters_idx ON public.courses USING btree (is_published, category, difficulty, created_at, id)'],
 ['0036','progress','progress_learner_completed_idx','CREATE INDEX progress_learner_completed_idx ON public.progress USING btree (user_id, lesson_id) WHERE is_completed'],
 ['0036','course_authors','course_authors_discovery_course_idx','CREATE INDEX course_authors_discovery_course_idx ON public.course_authors USING btree (course_id, order_index, id)'],
 ['0036','courses','courses_discovery_search_idx',"CREATE INDEX courses_discovery_search_idx ON public.courses USING gin (to_tsvector('simple'::regconfig, ((((((COALESCE(title, ''::text) || ' '::text) || COALESCE(short_description, ''::text)) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || category)))"],
];
export const supplementalIndexes=migrations=>indexes.filter(([prefix])=>migrations.some(m=>m.tag.startsWith(prefix+'_')));
export function expectedSequences(migrations){
 const result=[{schema:'drizzle',name:'__drizzle_migrations_id_seq',type:'integer',start:'1',increment:'1',max:'2147483647',min:'1',cache:'1',cycle:false,owner_schema:'drizzle',owner_table:'__drizzle_migrations',owner_column:'id'}];
 if(migrations.some(m=>m.tag.startsWith('0046_')&&/"sequence" bigint GENERATED ALWAYS AS IDENTITY \(sequence name "creator_commercial_events_sequence_seq"/.test(m.sql)))result.push({schema:'public',name:'creator_commercial_events_sequence_seq',type:'bigint',start:'1',increment:'1',max:'9223372036854775807',min:'1',cache:'1',cycle:false,owner_schema:'public',owner_table:'creator_commercial_events',owner_column:'sequence'});
 return result;
}
