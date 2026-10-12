import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { creatorTermsDocument, currentCreatorTerms } from '@/lib/workspace/terms/model';

export const metadata: Metadata = { title: 'Creator Terms — AirBharath Workspace', description: 'Versioned agreement for the private AirBharath Workspace creator platform.' };
export default async function CreatorTermsPage({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams;
  const entry = creatorTermsDocument(version ?? currentCreatorTerms().version);
  if (!entry) notFound();
  const { identity: terms, document, historicalDraft } = entry;
  return <main className="ph-no-capture mx-auto max-w-4xl px-5 pb-24 pt-28 sm:px-8">
    <Link href="/workspace" className="text-sm underline underline-offset-4">← Workspace</Link>
    <h1 className="mt-8 font-outfit text-4xl font-semibold sm:text-5xl">{document.title}</h1>
    {historicalDraft && <p role="status" className="mt-6 rounded-xl border border-border bg-muted p-5 text-sm leading-7">Historical draft for reference. V1 was recorded with unresolved legal details and is not the current agreement.</p>}
    <p className="mt-6 text-sm text-muted-foreground">Workspace payments are not publicly enabled.</p>
    <dl className="my-8 space-y-3 break-all text-sm"><div><dt className="font-semibold">Version</dt><dd>{terms.version}</dd></div><div><dt className="font-semibold">{historicalDraft ? 'Historical proposed effective date' : 'Effective:'}</dt><dd>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(terms.effectiveAt))}</dd></div><div><dt className="font-semibold">SHA-256 content hash</dt><dd className="font-mono text-xs">{terms.contentHash}</dd></div></dl>
    <div className="space-y-8 rounded-2xl border border-border bg-card p-6 sm:p-10">{document.sections.map((section, index) => <section key={section.title}><h2 className="font-outfit text-xl font-semibold">{index + 1}. {section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph} className="mt-4 text-sm leading-7 text-muted-foreground">{paragraph}</p>)}</section>)}</div>
    <p className="mt-8 text-sm"><Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link> · <Link href="/terms" className="underline underline-offset-4">Learner Terms of Service</Link></p>
  </main>;
}
