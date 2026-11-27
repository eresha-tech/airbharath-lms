import 'server-only';
import {getWorkspaceUser} from '../eligibility/service';
import {getAuthorizedAdminSession} from '@/lib/admin-authorization';
import {isSameOrigin,privateJson,readJson} from '../http';
import {operationsEnabled,OperationsError,object,listPage,uuid} from './model';
import {supportRepository} from './support';
import {notificationRepository} from './notifications';
export function operationFailure(error:unknown){return error instanceof OperationsError?privateJson({error:error.message},error.status):privateJson({error:'This action could not finish. Your saved information is retained. Reload before trying again.'},503);}
export async function operationActor(request:Request,admin=false){
 if(!operationsEnabled())throw new OperationsError(503,'Workspace support and operations are not enabled in this environment.');
 if(request.method!=='GET'&&!request.headers.get('origin'))throw new OperationsError(403,'A same-origin browser request is required.');
 if(!isSameOrigin(request)||request.headers.get('sec-fetch-site')==='cross-site')throw new OperationsError(403,'Request origin is not allowed.');
 const user=admin?await getAuthorizedAdminSession():await getWorkspaceUser();if(!user)throw new OperationsError(admin?403:401,'Please sign in with an authorized account.');return user;
}
export async function operationBody(request:Request,limit=24576){try{return await readJson(request,limit);}catch{throw new OperationsError(400,'Send a valid, bounded JSON request.');}}
export async function supportHttp(request:Request,id:string|null=null,admin=false){try{
 const user=await operationActor(request,admin),url=new URL(request.url);if(id)uuid(id);
 if(request.method==='GET'){
  if([...url.searchParams.keys()].some(k=>!['page','queue'].includes(k)))throw new OperationsError(400,'Check the support filters.');
  const page=listPage(url.searchParams.get('page')??undefined);return privateJson(id?await supportRepository().read(user.id,id,admin,page):await supportRepository().list(user.id,admin,url.searchParams.get('queue')??'new',page));
 }
 if(request.method!=='POST'||url.search)throw new OperationsError(400,'Check the support action.');
 const result=await supportRepository().execute(user.id,id,await operationBody(request,24576),admin);return privateJson(result);
 }catch(e){return operationFailure(e);}}
export async function notificationHttp(request:Request){try{
 const user=await operationActor(request);if(request.method!=='POST'||new URL(request.url).search)throw new OperationsError(400,'Check the notification action.');const body=object(await operationBody(request,1024),['key']);return privateJson(await notificationRepository().mark(user.id,String(body.key)));
 }catch(e){return operationFailure(e);}}
