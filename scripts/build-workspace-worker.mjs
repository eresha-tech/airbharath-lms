import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
// Reuse Next's installed build toolchain; no runtime TS loader or new dependency.
const compiler=require('next/dist/compiled/webpack/webpack');compiler.init();
await new Promise((resolve,reject)=>compiler.webpack({mode:'production',target:'node22',context:root,
 entry:'./scripts/workspace-background-worker.mjs',output:{path:path.join(root,'.next/workers'),filename:'worker.cjs',clean:true},
 plugins:[new compiler.webpack.optimize.LimitChunkCountPlugin({maxChunks:1})],
 optimization:{minimize:false},resolve:{extensions:['.ts','.tsx','.mjs','.js','.json'],alias:{'@':root,'server-only':false}},
 module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(root,'scripts/workspace-worker-typescript-loader.cjs')}]},
 externals:[({request},callback)=>{if(request==='sharp'||request==='next'||request?.startsWith('next/'))return callback(null,'commonjs '+request);callback();}],
},(error,stats)=>{if(error||stats?.hasErrors()||stats?.compilation.chunks.size!==1)reject(error??Error(stats.toString({all:false,errors:true})));else{console.log('Separate background worker bundle built.');resolve();}}));
// Next traces its web server separately. Trace the worker's remaining Next/native
// imports too so both entry points have a complete, reproducible runtime image.
const {nodeFileTrace}=require('next/dist/compiled/@vercel/nft');
const fs=await import('node:fs/promises');
const runtime=JSON.parse(await fs.readFile(path.join(root,'.next/required-server-files.json'),'utf8'));
const base=runtime.config.outputFileTracingRoot||root,entry=path.join(root,'.next/workers/worker.cjs');
const {fileList}=await nodeFileTrace([entry],{base,processCwd:root,mixedModules:true,ignore:['**/.env','**/.env.*','**/.aws/**']});
for(const file of fileList){
 if(path.isAbsolute(file)||file.startsWith('../'))throw Error('Worker trace escaped the reviewed build root.');
 const source=path.join(base,file),destination=path.join(root,'.next/standalone',file);
 if(source===entry)continue;
 try{await fs.lstat(destination);continue;}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.mkdir(path.dirname(destination),{recursive:true});
 const stat=await fs.lstat(source);
 if(stat.isSymbolicLink()){
  const target=await fs.readlink(source);if(path.isAbsolute(target))throw Error('Absolute worker dependency link refused.');await fs.symlink(target,destination);
 }else await fs.copyFile(source,destination);
}
console.log('Separate worker runtime dependencies traced into standalone output.');
