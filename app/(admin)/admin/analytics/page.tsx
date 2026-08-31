import { createAdminClient } from "@/lib/supabase-server";
import { TrendingUp, Users, LineChart, PieChart, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAnalytics() {
  const supabase = createAdminClient();

  // Fetch modules, lessons, enrollments, progress, orders, and students in parallel using Admin Client to bypass RLS
  const [
    modulesRes,
    lessonsRes,
    enrollmentsRes,
    progressRes,
    ordersRes,
    studentsRes
  ] = await Promise.all([
    supabase.from("modules").select("id, course_id"),
    supabase.from("lessons").select("id, module_id"),
    supabase.from("enrollments").select("user_id, course_id"),
    supabase.from("progress").select("user_id, lesson_id, updated_at").eq("is_completed", true),
    supabase.from("orders").select("id, amount, status, created_at"),
    supabase.from("users").select("id, created_at").eq("role", "student")
  ]);

  const modules = modulesRes.data;
  const lessons = lessonsRes.data;
  const enrollments = enrollmentsRes.data;
  const progress = progressRes.data;
  const orders = ordersRes.data;
  const students = studentsRes.data;

  const totalStudents = students?.length || 0;

  // --- Calculations ---

  // A. Monthly Growth (Revenue growth last 30 days vs 30 days before)
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(now.getDate() - 60);

  const paidOrders = orders?.filter(o => o.status === "paid") || [];
  const revLast30 = paidOrders
    .filter(o => new Date(o.created_at) >= thirtyDaysAgo)
    .reduce((sum, o) => sum + Number(o.amount), 0);

  const revPrev30 = paidOrders
    .filter(o => {
      const date = new Date(o.created_at);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    })
    .reduce((sum, o) => sum + Number(o.amount), 0);

  let growthRate = 0;
  if (revPrev30 > 0) {
    growthRate = ((revLast30 - revPrev30) / revPrev30) * 100;
  } else if (revLast30 > 0) {
    growthRate = 100; // 100% growth from 0 baseline
  }
  const growthRateText = growthRate >= 0 ? `+${growthRate.toFixed(1)}%` : `${growthRate.toFixed(1)}%`;

  // B. Retention Rate: Active students (completed >= 1 lesson) / Total Enrolled students
  const uniqueStudentsWithProgress = new Set(progress?.map(p => p.user_id) || []);
  const activeLearnersCount = uniqueStudentsWithProgress.size;
  const retentionRate = totalStudents > 0 ? (activeLearnersCount / totalStudents) * 100 : 0.0;

  // C. Refund Rate: refunded orders / total orders
  const totalOrdersCount = orders?.length || 0;
  const refundedOrdersCount = orders?.filter(o => o.status === "refunded").length || 0;
  const refundRate = totalOrdersCount > 0 ? (refundedOrdersCount / totalOrdersCount) * 100 : 0;

  // D. Daily Active Learners (DAL) - Unique learners completing lessons in the last 14 days
  const dalData: { label: string; count: number }[] = [];
  const progressList = progress || [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    // Start/End of this day
    const startOfDay = new Date(d.setHours(0,0,0,0));
    const endOfDay = new Date(d.setHours(23,59,59,999));

    const uniqueUsersThisDay = new Set(
      progressList
        .filter(p => {
          const uDate = new Date(p.updated_at);
          return uDate >= startOfDay && uDate <= endOfDay;
        })
        .map(p => p.user_id)
    );

    dalData.push({
      label: dayLabel,
      count: uniqueUsersThisDay.size
    });
  }

  // If DAL values are very low, we can scale them cleanly for representation
  const maxDalCount = Math.max(...dalData.map(d => d.count), 1);

  // E. Course Progress Breakdown
  // Map module to course
  const moduleToCourse: { [key: string]: string } = {};
  modules?.forEach(m => {
    moduleToCourse[m.id] = m.course_id;
  });

  // Map lesson to course
  const lessonToCourse: { [key: string]: string } = {};
  lessons?.forEach(l => {
    const cId = moduleToCourse[l.module_id];
    if (cId) {
      lessonToCourse[l.id] = cId;
    }
  });

  // Course to total lessons count
  const courseLessonsCount: { [key: string]: number } = {};
  lessons?.forEach(l => {
    const cId = moduleToCourse[l.module_id];
    if (cId) {
      courseLessonsCount[cId] = (courseLessonsCount[cId] || 0) + 1;
    }
  });

  // Group enrollments progress
  let completedCount = 0;
  let activeCount = 0;
  let startedCount = 0;
  let notStartedCount = 0;

  const enrollmentList = enrollments || [];
  enrollmentList.forEach(e => {
    const total = courseLessonsCount[e.course_id] || 0;
    if (total === 0) {
      notStartedCount++;
      return;
    }

    const completed = progressList.filter(p => p.user_id === e.user_id && lessonToCourse[p.lesson_id] === e.course_id).length;
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

  const totalEnrollmentsCount = enrollmentList.length || 1;
  const progressBreakdown = [
    {
      label: "Completed (100%)",
      count: `${completedCount} students`,
      percent: Math.round((completedCount / totalEnrollmentsCount) * 100),
      color: "bg-green-500"
    },
    {
      label: "Active (25%-99%)",
      count: `${activeCount} students`,
      percent: Math.round((activeCount / totalEnrollmentsCount) * 100),
      color: "bg-primary"
    },
    {
      label: "Started (1%-24%)",
      count: `${startedCount} students`,
      percent: Math.round((startedCount / totalEnrollmentsCount) * 100),
      color: "bg-yellow-500"
    },
    {
      label: "Not Started (0%)",
      count: `${notStartedCount} students`,
      percent: Math.round((notStartedCount / totalEnrollmentsCount) * 100),
      color: "bg-muted-foreground"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Top Section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Advanced Analytics</h1>
        <p className="text-muted-foreground text-sm">Review cohort progress, visual retention charts, and revenue statistics.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Monthly Growth</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{growthRateText}</h3>
          </div>
        </div>

        <div className="bg-card p-6 border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Retention Rate</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{retentionRate.toFixed(1)}%</h3>
          </div>
        </div>

        <div className="bg-card p-6 border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Refund Rate</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{refundRate.toFixed(2)}%</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Retention / Engagement Chart */}
        <div className="bg-card p-6 border rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" /> Daily Active Learners (DAL)
            </h3>
            <p className="text-xs text-muted-foreground">Unique learners completing lessons daily over the last 14 days</p>
          </div>
          <div className="h-64 flex items-end justify-between gap-3 border-b border-l border-border pb-2 pl-2">
            {dalData.map((data, idx) => {
              const heightPercent = maxDalCount > 0 ? (data.count / maxDalCount) * 80 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 bg-foreground text-background text-[10px] p-2 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap font-bold">
                    {data.count} Active Learners
                  </div>
                  <div 
                    style={{ height: `${Math.max(heightPercent, 5)}%` }} 
                    className="w-full bg-primary/80 rounded-t group-hover:bg-primary transition-all duration-300"
                  />
                  <span className="text-[8px] text-muted-foreground font-bold">{data.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion Breakdown */}
        <div className="bg-card p-6 border rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" /> Course Progress Breakdown
            </h3>
            <p className="text-xs text-muted-foreground">Status of students within structural curriculum courses</p>
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
