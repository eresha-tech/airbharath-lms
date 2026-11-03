'use client';
import { useState } from 'react';
import { HlsPlayer } from '@/components/video-player/HlsPlayer';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import type { lessonReceipt } from '@/lib/workspace/builder/service';
import type { assetReceipt } from '@/lib/workspace/media/service';
export type StudioAsset = ReturnType<typeof assetReceipt>;
export function PrivateVideo({ asset, captions, base }: { asset: StudioAsset; captions: StudioAsset[]; base: (id: string) => string }) {
  const [language,setLanguage]=useState(captions[0]?.id??'');
  const selected=captions.find(c=>c.id===language)??captions[0];
  return <div className="space-y-3"><HlsPlayer videoId={asset.id} lessonTitle={asset.displayName} privateManifestUrl={`${base(asset.id)}/stream/master.m3u8`} captionAvailable={!!selected} captionUrl={selected?`${base(selected.id)}/stream/captions.vtt`:undefined}/>{captions.length>1&&<label className="block text-sm">Caption language<select className="ml-3 rounded-lg border bg-background p-2" value={selected?.id??''} onChange={e=>setLanguage(e.target.value)}>{captions.map(c=><option key={c.id} value={c.id}>{c.language}</option>)}</select></label>}</div>;
}

export function LessonPreview({ lesson, assets, base, unsaved = false }: { lesson: Pick<ReturnType<typeof lessonReceipt>, 'title' | 'summary' | 'content' | 'contentFormat'>; assets: StudioAsset[]; base: (id: string) => string; unsaved?: boolean }) {
  const video = assets.find(a => a.assetKind === 'video' && a.isAttached && a.status === 'ready');
  const resources = assets.filter(a => a.assetKind === 'resource' && a.isAttached).sort((a,b) => a.resourcePosition! - b.resourcePosition!);
  return <article aria-label="Private lesson preview" className="space-y-6"><div><p className="text-xs uppercase tracking-widest text-primary">{unsaved ? 'Unsaved text preview' : 'Saved lesson preview'} · Private</p><h3 className="mt-2 font-outfit text-2xl">{lesson.title}</h3>{lesson.summary && <p className="mt-3 text-sm leading-7 text-muted-foreground">{lesson.summary}</p>}</div>{video && <PrivateVideo asset={video} captions={assets.filter(a => a.assetKind === 'caption' && a.isAttached && a.captionVideoId === video.id)} base={base} />}
    {lesson.contentFormat === 'markdown' ? <MarkdownContent content={lesson.content} privateWorkspace /> : <div className="whitespace-pre-wrap text-sm leading-8">{lesson.content}</div>}
    {resources.length > 0 && <section><h4 className="font-outfit text-lg">Lesson resources</h4><ul className="mt-3 divide-y divide-border rounded-lg border border-border">{resources.map(a => <li key={a.id}><a className="block min-h-11 px-4 py-3 text-sm text-primary underline" href={`${base(a.id)}/access`} download>{a.displayName} <span className="text-xs text-muted-foreground">· Download</span></a></li>)}</ul></section>}
    {!lesson.content.trim() && !video && <p className="text-sm text-muted-foreground">This saved lesson has no text or playable video yet.</p>}
  </article>;
}
