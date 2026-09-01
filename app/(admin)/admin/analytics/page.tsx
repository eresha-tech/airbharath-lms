import { db } from "@/lib/db";
import { modules, lessons, enrollments, progress, orders, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TrendingUp, Users as UsersIcon, LineChart, PieChart, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAnalytics() {
  const [
    modulesList,
    lessonsList,
    enrollmentsList,
    progressList,
    ordersList,
    studentsList
  ] = await Promise.all([
    db.query.modules.findMany(),
    db.query.lessons.findMany(),
    db.query.enrollments.findMany(),
    db.query.progress.findMany({ where: eq(progress.isCompleted, true) }),
    db.query.orders.findMany(),
    db.query.users.findMany({ where: eq(users.role, "student") }),
  ]);

  const totalStudents = studentsList.length;

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(now.getDate() - 60);

  const paidOrders = ordersList.filter((o: any) => o.status === "paid");
  const revLast30 = paidOrders
    .filter((o: any) => o.createdAt && new Date(o.createdAt) >= thirtyDaysAgo)
    .reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);

  const revPrev30 = paidOrders
    .filter((o: any) => {
      const date = o.createdAt ? new Date(o.createdAt) : null;
      return date && date >= sixtyDaysAgo && date < thirtyDaysAgo;
    })
    .reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);

  let growthRate = 0;
  if (revPrev30 > 0) {
    growthRate = ((revLast30 - revPrev30) / revPrev30) * 100;
  } else if (revLast30 > 0) {
    growthRate = 100;
  }
  const growthRateText = growthRate >= 0 ? `+${growthRate.toFixed(1)}%` : `${growthRate.toFixed(1)}%`;

  const uniqueStudentsWithProgress = new Set(progressList.map((p: any) => p.userId));
  const activeLearnersCount = uniqueStudentsWithProgress.size;
  const retentionRate = totalStudents > 0 ? (activeLearnersCount / totalStudents) * 100 : 0.0;

  const totalOrdersCount = ordersList.length;
  const refundedOrdersCount = ordersList.filter((o: any) => o.status === "refunded").length;
  const refundRate = totalOrdersCount > 0 ? (refundedOrdersCount / totalOrdersCount) * 100 : 0;

  const dalData: { label: string; count: number }[] = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    const startOfDay = new Date(d.setHours(0,0,0,0));
    const endOfDay = new Date(d.setHours(23,59,59,999));

    const uniqueUsersThisDay = new Set(
      progressList
        .filter((p: any) => {
          const uDate = p.updatedAt ? new Date(p.updatedAt) : null;
          return uDate && uDate >= startOfDay && uDate <= endOfDay;
        })
        .map((p: any) => p.userId)
    );

    dalData.push({
      label: dayLabel,
      count: uniqueUsersThisDay.size
    });
  }

  const maxDalCount = Math.max(...dalData.map(d => d.count), 1);

  const moduleToCourse: { [key: string]: string } = {};
  modulesList.forEach((m: any) => {
    moduleToCourse[m.id] = m.courseId;
  });

  const lessonToCourse: { [key: string]: string } = {};
  lessonsList.forEach((l: any) => {
    const cId = moduleToCourse[l.moduleId];
    if (cId) {
      lessonToCourse[l.id] = cId;
    }
  });

  const courseLessonsCount: { [key: string]: number } = {};
  lessonsList.forEach((l: any) => {
    const cId = moduleToCourse[l.moduleId];
    if (cId) {
      courseLessonsCount[cId] = (courseLessonsCount[cId] || 0) + 1;
    }
  });

  let completedCount = 0;
  let activeCount = 0;
  let startedCount = 0;
  let notStartedCount = 0;

  enrollmentsList.forEach((e: any) => {
    const total = courseLessonsCount[e.courseId] || 0;
    if (total === 0) {
      notStartedCount++;
      return;
    }

    const completed = progressList.filter((p: any) => p.userId === e.userId && lessonToCourse[p.lessonId] === e.courseId).length;
    const percent = Math.round((completed / total) * 100);

    if (percent === 100) {
      completedCount++;
    } else if (percent >= 25) {
      activeCount++;
    } else if (percent > 0) {
      startedCount++;
    } else {
      notStartedCount++;
    }
  });

  const totalEnrollmentsCount = enrollmentsList.length || 1;
  const progressBreakdown = [
    {
      label: "Completed (100%)",
      count: `${completedCount} students`,
      percent: Math.round((completedCount / totalEnrollmentsCount) * 100),
      color: "bg-[#014a62]"
    },
    {
      label: "Active (25%-99%)",
      count: `${activeCount} students`,
      percent: Math.round((activeCount / totalEnrollmentsCount) * 100),
      color: "bg-cyan-600"
    },
    {
      label: "Started (1%-24%)",
      count: `${startedCount} students`,
      percent: Math.round((startedCount / totalEnrollmentsCount) * 100),
      color: "bg-amber-500"
    },
    {
      label: "Not Started (0%)",
      count: `${notStartedCount} students`,
      percent: Math.round((notStartedCount / totalEnrollmentsCount) * 100),
      color: "bg-muted-foreground"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-instrument-serif text-[#014a62]">Airbharath LMS Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Review student cohort progress, active learner trends, and revenue metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#014a62]/10 text-[#014a62] flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Monthly Growth</p>
            <h3 className="text-2xl font-bold text-[#014a62] mt-1 font-instrument-sans">{growthRateText}</h3>
          </div>
        </div>

        <div className="bg-card p-6 border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#014a62]/10 text-[#014a62] flex items-center justify-center">
            <UsersIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Retention Rate</p>
            <h3 className="text-2xl font-bold text-[#014a62] mt-1 font-instrument-sans">{retentionRate.toFixed(1)}%</h3>
          </div>
        </div>

        <div className="bg-card p-6 border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#014a62]/10 text-[#014a62] flex items-center justify-center">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Refund Rate</p>
            <h3 className="text-2xl font-bold text-[#014a62] mt-1 font-instrument-sans">{refundRate.toFixed(2)}%</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card p-6 border rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-lg font-instrument-serif text-[#014a62] flex items-center gap-2">
              <LineChart className="h-5 w-5 text-[#014a62]" /> Daily Active Learners (DAL)
            </h3>
            <p className="text-xs text-muted-foreground">Unique learners completing lessons daily over the last 14 days</p>
          </div>
          <div className="h-64 flex items-end justify-between gap-3 border-b border-l border-border pb-2 pl-2">
            {dalData.map((data, idx) => {
              const heightPercent = maxDalCount > 0 ? (data.count / maxDalCount) * 80 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer">
                  <div className="absolute bottom-full mb-2 bg-foreground text-background text-[10px] p-2 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap font-bold">
                    {data.count} Active Learners
                  </div>
                  <div 
                    style={{ height: `${Math.max(heightPercent, 5)}%` }} 
                    className="w-full bg-[#014a62]/80 rounded-t group-hover:bg-[#014a62] transition-all duration-300"
                  />
                  <span className="text-[8px] text-muted-foreground font-bold">{data.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card p-6 border rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-lg font-instrument-serif text-[#014a62] flex items-center gap-2">
              <PieChart className="h-5 w-5 text-[#014a62]" /> Course Progress Breakdown
            </h3>
            <p className="text-xs text-muted-foreground">Status of students within Airbharath LMS courses</p>
          </div>
          <div className="space-y-4">
            {progressBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>{item.label}</span>
                  <span>{item.percent}% ({item.count})</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} transition-all duration-500`} style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
