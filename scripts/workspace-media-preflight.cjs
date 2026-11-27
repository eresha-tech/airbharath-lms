// Read-only inspection of the explicitly configured dedicated Workspace test target.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),requireNext=createRequire(require.resolve('next/package.json'));
requireNext('@next/env').loadEnvConfig(root,true,{info(){},error(){}});
const {createLoader,req}=require('../tests/postgres/workspace-financial-loader.cjs');
async function preflight(){
 const env=process.env,report={configuration:false,dedicatedTarget:false,checks:{},errors:{}};
 try {
  if(env.NODE_ENV==='production'||env.DATABASE_ENV!=='development'||env.VERCEL!==undefined)throw Error('local_environment_required');
  const c=createLoader({'server-only':{}})('@/lib/workspace/media/processing-provider').processingConfig(env);
  const lmsBuckets=[env.AWS_S3_RAW_BUCKET,env.AWS_S3_PROCESSED_BUCKET,'airbharath-lms-raw-uploads','airbharath-lms-processed-videos'].filter(Boolean);
  if(lmsBuckets.includes(c.bucket)||c.accessKeyId===env.AWS_ACCESS_KEY_ID)throw Error('dedicated_workspace_target_required');
  report.configuration=true;report.dedicatedTarget=true;
  const credentials={accessKeyId:c.accessKeyId,secretAccessKey:c.secretAccessKey,sessionToken:c.sessionToken},options={region:c.region,credentials,ignoreConfiguredEndpointUrls:true,maxAttempts:1};
  const s3sdk=req('@aws-sdk/client-s3'),mcsdk=req('@aws-sdk/client-mediaconvert'),s3=new s3sdk.S3Client(options),mc=new mcsdk.MediaConvertClient(options);
  const target={Bucket:c.bucket,ExpectedBucketOwner:c.accountId},timeout=()=>({abortSignal:AbortSignal.timeout(15000)});
  const results=await Promise.allSettled([
   s3.send(new s3sdk.GetPublicAccessBlockCommand(target),timeout()),s3.send(new s3sdk.GetBucketVersioningCommand(target),timeout()),s3.send(new s3sdk.GetBucketEncryptionCommand(target),timeout()),s3.send(new s3sdk.GetBucketCorsCommand(target),timeout()),mc.send(new mcsdk.GetQueueCommand({Name:c.queue.split('/').at(-1)}),timeout()),
  ]);
  const names=['privacy','versioning','encryption','cors','queue'];
  results.forEach((r,i)=>{if(r.status==='rejected')report.errors[names[i]]=/^[A-Za-z0-9_]+$/.test(r.reason?.name||'')?r.reason.name:'provider_unavailable';});
  const value=i=>results[i].status==='fulfilled'?results[i].value:null;
  const b=value(0)?.PublicAccessBlockConfiguration;
  report.checks.privateBucket=!!(b?.BlockPublicAcls&&b.IgnorePublicAcls&&b.BlockPublicPolicy&&b.RestrictPublicBuckets);
  report.checks.versioned=value(1)?.Status==='Enabled';
  report.checks.aes256=value(2)?.ServerSideEncryptionConfiguration?.Rules?.some(r=>r.ApplyServerSideEncryptionByDefault?.SSEAlgorithm==='AES256')||false;
  const headers=['content-type','if-none-match','x-amz-server-side-encryption','x-amz-expected-bucket-owner','x-amz-checksum-sha256','x-amz-meta-workspace-asset','x-amz-meta-workspace-owner','x-amz-meta-workspace-project','x-amz-meta-workspace-lesson','x-amz-meta-workspace-context'];
  const allows=(pattern,h)=>new RegExp('^'+pattern.toLowerCase().replace(/[.+?^${}()|[\]\\]/g,'\\$&').replaceAll('*','.*')+'$').test(h);
  report.checks.localCors=value(3)?.CORSRules?.some(r=>r.AllowedOrigins?.includes('http://localhost:3000')&&r.AllowedMethods?.includes('PUT')&&headers.every(h=>r.AllowedHeaders?.some(p=>allows(p,h))))||false;
  report.checks.queue=value(4)?.Queue?.Arn===c.queue&&value(4)?.Queue?.Status==='ACTIVE';
 }catch(e){report.errors.configuration=/^(local_environment_required|dedicated_workspace_target_required)$/.test(e.message||'')?e.message:'missing_or_invalid_workspace_configuration';}
 report.ready=report.configuration&&report.dedicatedTarget&&Object.values(report.checks).length===5&&Object.values(report.checks).every(Boolean);
 fs.mkdirSync(path.join(root,'output/audits/workspace-phase19-local'),{recursive:true});fs.writeFileSync(path.join(root,'output/audits/workspace-phase19-local/media-preflight.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));return report;
}
if(require.main===module)preflight().then(r=>{if(!r.ready)process.exitCode=1;}).catch(()=>{console.error('Workspace media preflight failed; private details suppressed.');process.exitCode=1;});
module.exports={preflight};
