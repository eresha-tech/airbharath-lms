import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { db } from '@/lib/db';
import { workspaceApplications as table } from '@/lib/db/schema';
import { APPLICATION_STATUSES, AVIATION_BACKGROUNDS, COURSE_READINESS, EXPERIENCE_RANGES, AUDIENCE_STATUS, type ApplicationStatus } from '@/lib/workspace/options';
import { privateJson } from '@/lib/workspace/http';

export async function GET(request: Request) {
  const session = await getAuthorizedAdminSession();
  if (!session) return privateJson({ error: 'Forbidden' }, 403);
  const params = new URL(request.url).searchParams;
  const filters = [];
  for (const [param, column, choices] of [
    ['status', table.applicationStatus, APPLICATION_STATUSES],
    ['background', table.aviationBackground, AVIATION_BACKGROUNDS],
    ['readiness', table.courseReadiness, COURSE_READINESS],
    ['experience', table.yearsExperience, EXPERIENCE_RANGES],
    ['audience', table.audienceStatus, AUDIENCE_STATUS],
  ] as const) {
    const value = params.get(param);
    if (!value) continue;
    if (!(choices as readonly string[]).includes(value)) return privateJson({ error: 'Invalid filter.' }, 400);
    filters.push(eq(column, value as ApplicationStatus));
  }
  const search = params.get('search')?.trim() || '';
  if (search.length > 200) return privateJson({ error: 'Search must be 200 characters or fewer.' }, 400);
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    filters.push(or(ilike(table.fullName, pattern), ilike(table.email, pattern), ilike(table.proposedCourseTopic, pattern), ilike(table.applicationReference, pattern))!);
  }
  const page = Number(params.get('page') || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) return privateJson({ error: 'Invalid page.' }, 400);
  try {
    const rows = await db.query.workspaceApplications.findMany({
      where: and(...filters), orderBy: [desc(table.submittedAt), desc(table.id)], limit: 26, offset: (page - 1) * 25,
      columns: { id: true, applicationReference: true, fullName: true, email: true, aviationBackground: true,
        proposedCourseTopic: true, yearsExperience: true, courseReadiness: true, audienceStatus: true,
        audienceSize: true, applicationStatus: true, submittedAt: true, potentialDuplicate: true },
    });
    return privateJson({ applications: rows.slice(0, 25), page, hasNextPage: rows.length > 25 });
  } catch { return privateJson({ error: 'Applications are unavailable. Please try again.' }, 503); }
}
