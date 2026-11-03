import 'server-only';
import sharp from 'sharp';
import { getWorkspaceUser } from '../eligibility/service';
import { privateJson,isSameOrigin,readJson } from '../http';
import { postgresMediaStore } from './repository';
import { mediaTransaction,assetReceipt } from './service';
import { workspaceMedia,workspaceMediaStorage } from './runtime';
import { environment } from '../creator/model';
import { mediaId,MediaError,MEDIA_BODY_LIMIT } from './model';
import { mediaFailure } from './http';
import { resourceBytes } from './uploads';
export async function artworkImage(bytes:Uint8Array){const png=await sharp(bytes,{limitInputPixels:40000000}).timeout({seconds:5}).resize(1200,675,{fit:'cover',withoutEnlargement:true}).png().toBuffer();return new Response(new Uint8Array(png),{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cross-Origin-Resource-Policy':'same-origin',Vary:'Cookie'}});}
export async function coverHttp(request:Request,project:string,assetId?:string){try{
 if(!isSameOrigin(request)||request.headers.get('sec-fetch-site')==='cross-site')throw new MediaError('forbidden');mediaId(project);if(new URL(request.url).search)throw new MediaError('validation');const user=await getWorkspaceUser();if(!user)throw new MediaError('authentication');
 const run=<T>(work:Parameters<typeof mediaTransaction<T>>[6])=>mediaTransaction(postgresMediaStore,environment(),()=>new Date(),user.id,{projectId:project},false,work);
 if(assetId){mediaId(assetId);if(request.method!=='GET')throw new MediaError('validation');const assetRun=<T>(work:Parameters<typeof mediaTransaction<T>>[6])=>mediaTransaction(postgresMediaStore,environment(),()=>new Date(),user.id,{assetId},false,work);const asset=await assetRun(async tx=>(await tx.assets()).find(a=>a.id===assetId&&a.projectId===project&&a.status==='ready'&&['image/png','image/jpeg'].includes(a.mimeType)));if(!asset)throw new MediaError('not_found');const response=await artworkImage(await resourceBytes(workspaceMediaStorage(),asset,true));await assetRun(async tx=>{if(!(await tx.assets()).some(a=>a.id===assetId&&a.status==='ready'&&a.objectVersionId===asset.objectVersionId))throw new MediaError('conflict');});return response;}
 if(request.method==='GET')return privateJson(await run(async tx=>({assets:(await tx.assets()).map(assetReceipt),mediaRevision:(await tx.lesson()).mediaRevision})));
 if(request.method!=='POST')return privateJson({error:'Method not allowed'},405);
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new MediaError('validation');let raw;try{raw=await readJson(request,MEDIA_BODY_LIMIT);}catch(e){throw new MediaError(e instanceof Error&&e.message==='BODY_TOO_LARGE'?'too_large':'validation');}if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['filename','mimeType','byteSize','requestKey','expectedMediaRevision'].includes(k)))throw new MediaError('validation');
 const result=await workspaceMedia().reserve(user.id,{...raw,lessonId:project,assetKind:'resource'},project);return privateJson(result,result.created?201:200);
}catch(e){return mediaFailure(e);}}
