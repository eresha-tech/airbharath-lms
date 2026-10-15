
'use client';
import {useEffect,useState} from 'react';
import type {ListParams} from '@/lib/workspace/admin/pagination';
import {WorkspaceInfluencers,type InfluencerRow} from '@/components/workspace/WorkspaceInfluencers';
export function InfluencerDirectory({initial,filters,hasNext}:{initial:InfluencerRow[];filters:ListParams;hasNext:boolean}){const [rows,setRows]=useState(initial);useEffect(()=>setRows(initial),[initial]);return <WorkspaceInfluencers rows={rows} onChange={setRows} filters={filters} initialHasNext={hasNext}/>;}
