import { createHash } from 'node:crypto';
// Interim, explicit publishing acknowledgment. Detailed founder guidelines will
// replace this version prospectively, requiring a new acknowledgment to publish.
export const PUBLISHING_GUIDELINES={version:'creator_publishing_2026_01',title:'AirBharath publishing acknowledgment',paragraphs:[
 'I am responsible for the content and price of this course and will follow AirBharath publishing guidelines.',
 'I have permission to publish the course materials and will address reported safety, accuracy, privacy or rights concerns.',
 'AirBharath may flag content, request corrections, unpublish or suspend a course after publication. I can submit corrections or an appeal.',
 'Detailed publishing guidelines will be provided later. A new guideline version will require acknowledgment before my next publication.',
]};
export const GUIDELINE_HASH=createHash('sha256').update(JSON.stringify(PUBLISHING_GUIDELINES)).digest('hex');
export type GuidelineAcceptance={version:string;contentHash:string;acceptedAt:string;actorId:string};
export type Moderation={restriction:'none'|'flagged'|'corrections'|'unpublished'|'suspended';reason:string;caseId:string;correction:string|null;appeal:string|null};
export function currentGuidelines(a:GuidelineAcceptance|null|undefined,owner:string){return a?.version===PUBLISHING_GUIDELINES.version&&a.contentHash===GUIDELINE_HASH&&a.actorId===owner;}
export const publishRestricted=(m:Moderation|null|undefined)=>!!m&&['unpublished','suspended'].includes(m.restriction);
