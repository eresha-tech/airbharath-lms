import { spawn } from 'node:child_process';
const args=process.argv.slice(2),media=args.includes('--media');
if(media&&args.some(arg=>arg!=='--media')||args.filter(arg=>arg==='--media').length>1){console.error('Use pnpm dev --media without additional flags.');process.exit(1);}
const child=media?spawn(process.execPath,['scripts/workspace-local-uat.mjs','--media'],{stdio:'inherit',env:process.env}):spawn('pnpm',['exec','next','dev','--turbopack',...args],{stdio:'inherit',env:process.env});
process.on('SIGTERM',()=>child.kill('SIGTERM'));process.on('SIGINT',()=>child.kill('SIGINT'));
child.on('error',()=>{console.error('Local development could not start.');process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});
