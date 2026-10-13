import { UUID } from '../eligibility/model';
export class AdminListError extends Error {constructor(public code:'validation'|'forbidden'|'unavailable'){super(code)}}
export type ListParams={q:string;status:string;sort:'newest'|'oldest'|'name';size:25|50;page:number;cursor:string;mode:'live'|'test'};
export function listParams(raw:Record<string,unknown>):ListParams{
 const value=(k:string,d='')=>{const v=raw[k]??d;if(typeof v!=='string')throw new AdminListError('validation');return v;};
 const page=value('page','1'),size=value('size','25'),q=value('q').trim(),status=value('status','all'),sort=value('sort','newest'),mode=value('mode','live'),cursor=value('cursor');
 if(!/^[1-9]\d{0,2}$/.test(page)||Number(page)>500||!['25','50'].includes(size)||q.length>120||/[\u0000-\u001f\u007f]/.test(q)||!['newest','oldest','name'].includes(sort)||!['live','test'].includes(mode)||cursor.length>1200)throw new AdminListError('validation');
 return{q,status,sort:sort as ListParams['sort'],size:Number(size) as 25|50,page:Number(page),cursor,mode:mode as 'live'|'test'};
}
export type Cursor={anchor:string;time:string;id:string;signature:string};
export function decodeCursor(cursor:string,signature:string):Cursor|null{if(!cursor)return null;try{const c=JSON.parse(Buffer.from(cursor,'base64url').toString());if(Object.keys(c).sort().join()!=='anchor,id,signature,time'||c.signature!==signature||!UUID.test(c.id)||![c.anchor,c.time].every(v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v)||c.time>c.anchor)throw Error();return c;}catch{throw new AdminListError('validation');}}
export function encodeCursor(c:Cursor){return Buffer.from(JSON.stringify(c)).toString('base64url');}
export function escapedSearch(q:string){return '%'+q.replace(/[\\%_]/g,'\\$&')+'%';}
