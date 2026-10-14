import Link from 'next/link';
import { WorkspaceLaunchNotice } from './ui/WorkspaceUI';
export function EligibilityShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <div className="ph-no-capture mx-auto max-w-3xl px-5 pb-20 pt-28 sm:px-8"><Link href="/workspace" className="text-sm text-muted-foreground underline underline-offset-4">← Workspace</Link><p className="mt-10 text-xs font-bold uppercase tracking-[.2em] text-primary">AirBharath Workspace</p><h1 className="mt-4 font-outfit text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">{intro}</p><div className="mt-6"><WorkspaceLaunchNotice/></div><div className="mt-9">{children}</div></div>;
}
