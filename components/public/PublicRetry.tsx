'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
export function PublicRetry({ label }: {
    label: string;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    return <div>
    <button type="button" disabled={pending} aria-busy={pending} className="public-text-link" onClick={() => startTransition(() => router.refresh())}>{pending ? 'Loading…' : label}</button>
    <span role="status" className="sr-only">{pending ? 'Loading current information' : ''}</span>
    </div>;
}
