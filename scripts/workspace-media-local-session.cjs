const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
function fixture(target){
 const f=JSON.parse(fs.readFileSync(path.join(target.root,'output/audits/workspace-phase19-local/fixture.json'),'utf8'));
 if(f.localOnly!==true)throw Error('local_fixture_required');return f;
}
async function session(target,f,role){
 if(!['creator','admin','other'].includes(role))throw Error('invalid_test_role');
 const id=role==='creator'?f.owner:role==='admin'?f.adminId:f.other;
 const [user]=await target.client`select id,full_name,role from users where id=${id}`;
 if(!user||user.full_name!==`SYNTHETIC PHASE19 FOUNDER ${role==='creator'?'CREATOR':role==='admin'?'ADMIN':'OTHER'}`||user.role!==(role==='admin'?'admin':'student'))throw Error('synthetic_identity_required');
 if(!target.env.JWT_SECRET||target.env.JWT_SECRET.length<32)throw Error('local_jwt_secret_required');
 const {SignJWT}=target.req('jose');
 return new SignJWT({id:user.id,phone:'',fullName:user.full_name,role:user.role}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('2h').sign(new TextEncoder().encode(target.env.JWT_SECRET));
}
function browserRuntime(){
 const file=process.env.WORKSPACE_BROWSER_RUNTIME||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 if(!fs.existsSync(file))throw Error('existing_browser_runtime_required');return require(file);
}
module.exports={fixture,session,browserRuntime};
