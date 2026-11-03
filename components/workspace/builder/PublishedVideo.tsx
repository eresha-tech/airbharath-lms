'use client';
import { useCallback } from 'react';
import { PrivateVideo,type StudioAsset } from './Preview';
export function PublishedVideo({assets,basePath}:{assets:StudioAsset[];basePath:string}){const base=useCallback((id:string)=>`${basePath}/${id}`,[basePath]);const video=assets.find(a=>a.assetKind==='video');return video?<PrivateVideo asset={video} captions={assets.filter(a=>a.assetKind==='caption'&&a.captionVideoId===video.id)} base={base}/>:null;}
