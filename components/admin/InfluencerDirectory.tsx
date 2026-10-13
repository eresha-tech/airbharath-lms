'use client';
import {useState} from 'react';
import {WorkspaceInfluencers,type InfluencerRow} from '@/components/workspace/WorkspaceInfluencers';
export function InfluencerDirectory({initial}:{initial:InfluencerRow[]}){const [rows,setRows]=useState(initial);return <WorkspaceInfluencers rows={rows} onChange={setRows}/>;}
