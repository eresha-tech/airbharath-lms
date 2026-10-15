'use client';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export function SearchInput({ onNavigate }: {
    onNavigate?: () => void;
}) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    return <form role="search" aria-label="Course search" onSubmit={event => { event.preventDefault(); if (query.trim()) {
        router.push(`/search/${encodeURIComponent(query.trim())}`);
        onNavigate?.();
    } }} className="relative w-full">
    <label>
    <span className="sr-only">Search courses</span>
    <input type="search" placeholder="Search courses" value={query} onChange={event => setQuery(event.target.value)} className="min-h-12 w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground"/>
    </label>
    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-4 size-4 text-muted-foreground"/>
  </form>;
}
