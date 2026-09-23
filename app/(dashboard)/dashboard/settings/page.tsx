import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, enrollments, progress, certificates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SettingsView, SettingsUser, SettingsStats } from "@/components/dashboard/SettingsView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account Settings | Airbharath LMS",
  description: "Manage your student profile, account security, and notification preferences.",
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch full user record and real student learning data in parallel
  const [userRecord, studentEnrollments, studentProgress, studentCertificates] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, session.id),
    }),
    db.query.enrollments.findMany({
      where: eq(enrollments.userId, session.id),
    }),
    db.query.progress.findMany({
      where: eq(progress.userId, session.id),
    }),
    db.query.certificates.findMany({
      where: eq(certificates.userId, session.id),
    }),
  ]);

  const currentUser: SettingsUser = {
    id: session.id,
    phone: userRecord?.phone || session.phone,
    email: userRecord?.email || session.email || "",
    fullName: userRecord?.fullName || session.fullName || "",
    avatarUrl: userRecord?.avatarUrl || null,
    role: userRecord?.role || session.role || "student",
    createdAt: userRecord?.createdAt || null,
  };

  const completedLessonsCount = studentProgress.filter((p: any) => p.isCompleted).length;

  const stats: SettingsStats = {
    enrolledCount: studentEnrollments.length,
    certificatesCount: studentCertificates.length,
    completedLessonsCount,
  };

  return <SettingsView initialUser={currentUser} stats={stats} />;
}
