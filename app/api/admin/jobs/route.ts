import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { serverTrack } from "@/lib/analytics-server";

export async function GET() {
  try {
    const jobsList = await db.query.jobs.findMany({
      orderBy: [desc(jobs.createdAt)],
    });

    const formattedJobs = jobsList.map((j: any) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      description: j.description,
      link: j.link,
      created_at: j.createdAt,
    }));

    return NextResponse.json({ jobs: formattedJobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, company, location, description, link } = await req.json();

    const [newJob] = await db
      .insert(jobs)
      .values({
        title,
        company,
        location: location || "Remote",
        description,
        link,
        postedBy: session.id,
      })
      .returning();

    await serverTrack(session.id, "admin_job_created", {
      job_id: newJob.id,
      title: newJob.title,
      company: newJob.company,
    });

    return NextResponse.json({ job: newJob });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(jobs).where(eq(jobs.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
