'use client';
export default function CreatorErrorPage({ reset }: { reset: () => void }) {
  return <section className="ph-no-capture mx-auto max-w-3xl space-y-5 px-6 py-12"><h1 className="font-outfit text-3xl">Workspace unavailable</h1><p role="status">We could not load your Workspace. Please try again later. Access cannot be confirmed while membership status is unavailable.</p><button onClick={reset} className="rounded-lg bg-primary px-5 py-3 text-primary-foreground">Try again</button></section>;
}
