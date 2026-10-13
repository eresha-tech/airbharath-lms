'use client';
export default function Error({reset}:{reset:()=>void}){return <div className="space-y-4"><h1 className="text-3xl">Workspace administration unavailable</h1><p role="alert">The page could not be loaded. Access has not been changed.</p><button onClick={reset} className="min-h-11 rounded-lg border px-4">Try again</button></div>;}
