// Genuine AWS test, disabled by default. Requires a fresh browser-fixture database
// inside the separately verified disposable /tmp cluster. Retains remote objects.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
if(process.env.WORKSPACE_MEDIA_NONPRODUCTION_VERIFY!=='true'){console.log('Nonproduction AWS media verification disabled.');process.exit(0);}
assert.equal(process.env.DATABASE_ENV,'test');assert.notEqual(process.env.NODE_ENV,'production');assert.equal(process.env.VERCEL,undefined);
const {createLoader,req}=require('./workspace-financial-loader.cjs'),f=JSON.parse(fs.readFileSync('/tmp/phase19c-browser-fixture.json'));
const root=fs.realpathSync(f.root);assert.match(root,/^\/tmp\/airbharath-media-pg-[A-Za-z0-9_-]+$/);assert.match(f.database,/^phase19b_[a-f0-9]{32}$/);
const postgres=req('postgres'),{drizzle}=req('drizzle-orm/postgres-js');
const client=postgres({host:path.join(root,'socket'),port:55439,user:'phase19b',database:f.database,max:1,prepare:false,onnotice:()=>{}});
const report={checks:[],remoteObjectsRetained:true};const ok=name=>{report.checks.push(name);console.log('PASS '+name);};
(async()=>{try{
 const [identity]=await client`select current_setting('data_directory') as directory,current_database() as database,current_setting('port') as port`;
 assert.equal(fs.realpathSync(identity.directory),path.join(root,'data'));assert.equal(identity.database,f.database);assert.equal(identity.port,'55439');
 const schema=createLoader({'server-only':{}})('@/lib/db/schema');
 const load=createLoader({'server-only':{},'@/lib/auth':{getSession:async()=>null},'@/lib/db':{db:drizzle(client,{schema})}});
 const config=load('@/lib/workspace/media/processing-provider').processingConfig();
 assert.equal(config.bucket,process.env.WORKSPACE_MEDIA_NONPRODUCTION_BUCKET_ACK);assert.equal(config.accountId,process.env.WORKSPACE_MEDIA_NONPRODUCTION_ACCOUNT_ACK);
 const provider=load('@/lib/workspace/media/provider').s3MediaStorage(config),repo=load('@/lib/workspace/media/repository').postgresMediaStore;
 const uploads=load('@/lib/workspace/media/uploads').mediaUploads(repo,'test',()=>new Date(),provider),domain=load('@/lib/workspace/media/service').mediaService(repo,'test',()=>new Date(),provider.identity);
 const processor=load('@/lib/workspace/media/processing-provider').processingProvider(config),processing=load('@/lib/workspace/media/processing').mediaProcessing(repo,'test',()=>new Date(),processor);
 const builder=load('@/lib/workspace/builder/repository').workspaceBuilder();
 const title='Genuine private media '+randomUUID(),tree=(await builder.mutate(f.owner,f.draftId,{action:'create_lesson',moduleId:f.moduleId,content:{title,summary:'Synthetic nonproduction integration only',content:'Private integration fixture',contentFormat:'plain_text'}}));
 const lesson=tree.lessons.find(l=>l.title===title);assert(lesson);
 const revision=async()=>(await domain.list(f.owner,lesson.id)).mediaRevision;
 const mutate=async(id,action)=>{const current=await domain.read(f.owner,id);return domain.mutate(f.owner,id,{action,expectedVersion:current.asset.version,expectedMediaRevision:current.mediaRevision});};
 const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
 async function put(asset,bytes){const {upload}=await uploads.authorize(f.owner,asset.id,{checksumSHA256:checksum(bytes)});const response=await fetch(upload.url,{method:'PUT',headers:upload.headers,body:bytes,redirect:'error',signal:AbortSignal.timeout(60000)});assert.equal(response.ok,true,'conditional private PUT');const replay=await fetch(upload.url,{method:'PUT',headers:upload.headers,body:bytes,redirect:'error',signal:AbortSignal.timeout(60000)});assert.equal(replay.status,412,'conditional overwrite denied');await uploads.finalize(f.owner,asset.id,{});}
 async function reserve(assetKind,filename,mimeType,bytes){return (await uploads.intent(f.owner,{lessonId:lesson.id,assetKind,filename,mimeType,byteSize:bytes.length,requestKey:randomUUID(),expectedMediaRevision:await revision()})).asset;}
 const dir=fs.mkdtempSync('/tmp/airbharath-real-media-');
 execFileSync('/usr/bin/ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=640x360:rate=24','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','3','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',path.join(dir,'synthetic.mp4')],{timeout:30000,stdio:'ignore'});
 const videoBytes=fs.readFileSync(path.join(dir,'synthetic.mp4')),video=await reserve('video','synthetic.mp4','video/mp4',videoBytes);await put(video,videoBytes);assert.equal((await domain.read(f.owner,video.id)).asset.status,'verified');ok('real_private_conditional_upload_pinned_identity_checksum_video_not_playable');
 await processing.request(f.owner,video.id,{});await processing.dispatch(f.owner,video.id);
 const deadline=Date.now()+15*60000;
 while(Date.now()<deadline){await processing.reconcile(f.owner,video.id);const a=(await domain.read(f.owner,video.id)).asset;if(a.status==='ready')break;assert.notEqual(a.status,'failed','real transcode failed');await new Promise(r=>setTimeout(r,10000));}
 assert.equal((await domain.read(f.owner,video.id)).asset.status,'ready');await mutate(video.id,'attach');ok('real_mediaconvert_complete_verified_hls_then_attachment');
 const delivery=load('@/lib/workspace/media/delivery').privateMediaDelivery;
 const master=await delivery({creator:f.owner},video.id,'master.m3u8',`/api/workspace/media/${video.id}/stream`),masterText=await master.text();assert(masterText.includes(`/api/workspace/media/${video.id}/stream/master_720.m3u8`));
 const variant=await delivery({creator:f.owner},video.id,'master_720.m3u8',`/api/workspace/media/${video.id}/stream`),variantText=await variant.text(),segment=variantText.split('\n').find(l=>l.endsWith('.ts')).split('/').at(-1);
 assert.equal((await delivery({creator:f.owner},video.id,segment,`/api/workspace/media/${video.id}/stream`)).status,200);ok('real_pinned_private_playlist_and_segment_delivery');
 const pdf=await req('pdf-lib').PDFDocument.create();pdf.addPage();const pdfBytes=Buffer.from(await pdf.save()),resource=await reserve('resource','notes.pdf','application/pdf',pdfBytes);await put(resource,pdfBytes);await mutate(resource.id,'attach');assert.equal(checksum((await uploads.download(f.owner,resource.id)).bytes),checksum(pdfBytes));ok('real_verified_pdf_attachment_private_download');
 const vtt=Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nSynthetic private caption\n');
 const caption=(await uploads.captionIntent(f.owner,video.id,{filename:'captions.vtt',byteSize:vtt.length,language:'en',requestKey:randomUUID(),expectedMediaRevision:await revision()})).asset;
 await put(caption,vtt);await mutate(caption.id,'attach');assert.equal(await (await delivery({creator:f.owner},caption.id,'captions.vtt',`/api/workspace/media/${caption.id}/stream`)).text(),vtt.toString());ok('real_source_bound_private_caption_delivery');
 await assert.rejects(()=>domain.read(randomUUID(),video.id));ok('unknown_owner_denied_before_private_provider_access');
 fs.writeFileSync('/tmp/phase19c-provider-results.json',JSON.stringify({...report,lessonId:lesson.id},null,2));
 console.log('Provider checks passed. Browser CORS, callback transport and founder UI acceptance remain separate gates. Remote test objects are retained for reviewed cleanup.');
}finally{await client.end({timeout:2});}})().catch(()=>{console.error('Nonproduction media verification failed; provider details suppressed.');process.exitCode=1;});
