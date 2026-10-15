'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { trackWorkspace } from '@/lib/workspace/analytics';
export function WorkspacePageView() {
    const tracked = useRef(false);
    useEffect(() => { if (!tracked.current) {
        tracked.current = true;
        trackWorkspace('workspace_page_view');
    } }, []);
    return null;
}
export function WorkspaceEntryLink({ entryPoint = 'hero' }: {
    entryPoint?: 'hero' | 'founding_cohort';
}) {
    return <Link className="public-button" href="/workspace/apply" onClick={() => trackWorkspace('workspace_apply_clicked', undefined, undefined, { entryPoint })}>Check Eligibility<span aria-hidden="true">↗</span>
    </Link>;
}
