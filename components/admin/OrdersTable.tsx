"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Download,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  status: string;
  created_at: string;
  users: any;
  courses: any;
}

export default function OrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed">("all");

  const normalizedOrders = useMemo(() => {
    return initialOrders.map((order) => {
      const userObj = Array.isArray(order.users) ? order.users[0] : order.users;
      const courseObj = Array.isArray(order.courses) ? order.courses[0] : order.courses;
      return {
        ...order,
        studentName: userObj?.full_name || "Guest Student",
        studentEmail: userObj?.email || "No email",
        courseTitle: courseObj?.title || "Course Enrollment",
        amountNum: Number(order.amount) || 0,
      };
    });
  }, [initialOrders]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return normalizedOrders.filter((order) => {
      const payId = (order.razorpay_payment_id || "").toLowerCase();
      const ordId = (order.razorpay_order_id || "").toLowerCase();
      const studentName = order.studentName.toLowerCase();
      const studentEmail = order.studentEmail.toLowerCase();
      const courseTitle = order.courseTitle.toLowerCase();

      const matchesSearch =
        payId.includes(term) ||
        ordId.includes(term) ||
        studentName.includes(term) ||
        studentEmail.includes(term) ||
        courseTitle.includes(term);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "paid"
          ? order.status === "paid"
          : statusFilter === "pending"
          ? order.status === "pending"
          : order.status !== "paid" && order.status !== "pending";

      return matchesSearch && matchesStatus;
    });
  }, [normalizedOrders, searchTerm, statusFilter]);

  const totalRevenue = useMemo(() => {
    return normalizedOrders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + o.amountNum, 0);
  }, [normalizedOrders]);

  const paidCount = useMemo(() => {
    return normalizedOrders.filter((o) => o.status === "paid").length;
  }, [normalizedOrders]);

  const pendingCount = useMemo(() => {
    return normalizedOrders.filter((o) => o.status === "pending").length;
  }, [normalizedOrders]);

  const failedCount = useMemo(() => {
    return normalizedOrders.filter((o) => o.status !== "paid" && o.status !== "pending").length;
  }, [normalizedOrders]);

  return (
    <div className="space-y-6">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Revenue
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Paid Razorpay orders</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Successful
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 font-outfit">
              {paidCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Confirmed payments</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pending
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 font-outfit">
              {pendingCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Checkout awaiting capture</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Failed / Refunded
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 font-outfit">
              {failedCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Cancelled or refunded</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-2xl border-border/80 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name, email, course, or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-input rounded-xl bg-background text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Orders" },
            { id: "paid", label: "Paid" },
            { id: "pending", label: "Pending" },
            { id: "failed", label: "Failed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0",
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Orders Data Table */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                    {/* Transaction ID */}
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-semibold text-foreground">
                        {order.razorpay_payment_id || order.razorpay_order_id || "Direct Entry"}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                        {order.id.slice(0, 8)}…
                      </span>
                    </td>

                    {/* Student */}
                    <td className="px-6 py-4">
                      <div className="text-xs sm:text-sm font-bold text-foreground font-outfit">
                        {order.studentName}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {order.studentEmail}
                      </div>
                    </td>

                    {/* Course */}
                    <td className="px-6 py-4 text-xs font-medium text-foreground max-w-xs truncate">
                      {order.courseTitle}
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 text-xs font-bold text-foreground tabular-nums">
                      ₹{order.amountNum.toLocaleString("en-IN")}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider",
                          order.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : order.status === "pending"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        )}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">No orders found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No transactions match the selected filter or search query.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
