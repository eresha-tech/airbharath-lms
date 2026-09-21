"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Download,
  Filter,
  Receipt,
  FileText,
  User,
  Phone,
  Mail,
  Copy,
  Check,
  X,
  ExternalLink,
  BookOpen,
  ArrowUpDown,
  ShieldCheck,
  Calendar,
  Building,
  DollarSign,
  Tag,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FormattedOrder {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: number;
  baseAmount: number;
  gstAmount: number;
  status: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
  } | null;
  course: {
    id: string;
    title: string;
    slug: string | null;
    thumbnailUrl: string | null;
    price: number;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    taxableAmount: number;
    gstAmount: number;
    totalAmount: number;
  } | null;
}

interface OrdersTableProps {
  initialOrders: FormattedOrder[];
}

export default function OrdersTable({ initialOrders = [] }: OrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed">("all");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount-desc" | "amount-asc" | "customer-asc">("newest");

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active Order Detail Modal State
  const [activeOrderDetail, setActiveOrderDetail] = useState<FormattedOrder | null>(null);

  // Helper to copy text to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Distinct courses for filter dropdown
  const uniqueCourses = useMemo(() => {
    const map = new Map<string, string>();
    initialOrders.forEach((o) => {
      if (o.course?.id && o.course?.title) {
        map.set(o.course.id, o.course.title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [initialOrders]);

  // Overall Financial & Transaction Metrics
  const totalRevenue = useMemo(() => {
    return initialOrders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + (o.amount || 0), 0);
  }, [initialOrders]);

  const paidCount = useMemo(() => {
    return initialOrders.filter((o) => o.status === "paid").length;
  }, [initialOrders]);

  const pendingCount = useMemo(() => {
    return initialOrders.filter((o) => o.status === "pending").length;
  }, [initialOrders]);

  const failedCount = useMemo(() => {
    return initialOrders.filter((o) => o.status !== "paid" && o.status !== "pending").length;
  }, [initialOrders]);

  // Filtered and Sorted Orders
  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return initialOrders
      .filter((order) => {
        // Search term matching
        const payId = (order.razorpayPaymentId || "").toLowerCase();
        const ordId = (order.razorpayOrderId || "").toLowerCase();
        const orderId = order.id.toLowerCase();
        const studentName = (order.user?.fullName || "").toLowerCase();
        const studentEmail = (order.user?.email || "").toLowerCase();
        const studentPhone = (order.user?.phone || "").toLowerCase();
        const courseTitle = (order.course?.title || "").toLowerCase();
        const invoiceNum = (order.invoice?.invoiceNumber || "").toLowerCase();

        const matchesSearch =
          !term ||
          payId.includes(term) ||
          ordId.includes(term) ||
          orderId.includes(term) ||
          studentName.includes(term) ||
          studentEmail.includes(term) ||
          studentPhone.includes(term) ||
          courseTitle.includes(term) ||
          invoiceNum.includes(term);

        if (!matchesSearch) return false;

        // Status tab filtering
        if (statusFilter === "paid" && order.status !== "paid") return false;
        if (statusFilter === "pending" && order.status !== "pending") return false;
        if (statusFilter === "failed" && (order.status === "paid" || order.status === "pending")) return false;

        // Specific course dropdown filter
        if (selectedCourseFilter !== "all" && order.course?.id !== selectedCourseFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === "amount-desc") {
          return (b.amount || 0) - (a.amount || 0);
        }
        if (sortBy === "amount-asc") {
          return (a.amount || 0) - (b.amount || 0);
        }
        if (sortBy === "customer-asc") {
          return (a.user?.fullName || "").localeCompare(b.user?.fullName || "");
        }
        return 0;
      });
  }, [initialOrders, searchTerm, statusFilter, selectedCourseFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-primary/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Gross Revenue
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              ₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
              Settled Razorpay payments
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-emerald-500/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Successful Orders
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-outfit">
              {paidCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              Confirmed & captured
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-amber-500/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pending Checkouts
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-outfit">
              {pendingCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
              Awaiting student capture
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-rose-500/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Failed / Cancelled
            </span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-outfit">
              {failedCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />
              Incomplete or refunded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Toolbar */}
      <Card className="rounded-2xl border-border/80 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by Razorpay ID, student name, email, course, invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl bg-background text-xs sm:text-sm font-medium focus-visible:ring-primary h-10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter dropdowns & Sort selector */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Course Filter */}
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-10 max-w-[200px] truncate"
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            {/* Sorting Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-10"
            >
              <option value="newest">Date: Newest First</option>
              <option value="oldest">Date: Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
              <option value="customer-asc">Customer: A → Z</option>
            </select>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { id: "all", label: "All Transactions", count: initialOrders.length },
              { id: "paid", label: "Paid & Settled", count: paidCount },
              { id: "pending", label: "Pending", count: pendingCount },
              { id: "failed", label: "Failed / Cancelled", count: failedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-md text-[10px] font-extrabold",
                    statusFilter === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {(searchTerm || statusFilter !== "all" || selectedCourseFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setSelectedCourseFilter("all");
              }}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </Card>

      {/* Desktop Orders Data Table (Visible on md+) */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/70 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                <th className="px-6 py-4">Transaction / Razorpay ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Course Enrolled</th>
                <th className="px-6 py-4">Amount & GST</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const initials = order.user?.fullName
                    ? order.user.fullName
                        .split(" ")
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : "CU";

                  return (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors group">
                      {/* Transaction IDs Column */}
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-foreground block truncate max-w-[160px]" title={order.razorpayPaymentId || order.razorpayOrderId}>
                              {order.razorpayPaymentId || order.razorpayOrderId || "Direct Entry"}
                            </span>
                            {(order.razorpayPaymentId || order.razorpayOrderId) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    order.razorpayPaymentId || order.razorpayOrderId,
                                    `rzp-${order.id}`
                                  )
                                }
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy Razorpay ID"
                              >
                                {copiedId === `rzp-${order.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3 opacity-60 hover:opacity-100" />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                            <span>Ref: {order.id.slice(0, 8)}…</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal bg-muted/50 border-border/60 text-muted-foreground">
                              Razorpay
                            </Badge>
                          </div>
                          {order.invoice?.invoiceNumber && (
                            <span className="text-[10px] font-mono text-primary block">
                              Inv: {order.invoice.invoiceNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer Column */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 border border-border/80 shadow-2xs shrink-0 mt-0.5">
                            {order.user?.avatarUrl && (
                              <AvatarImage src={order.user.avatarUrl} alt={order.user.fullName || "Customer"} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-foreground block font-outfit truncate">
                              {order.user?.fullName || "Registered Learner"}
                            </span>
                            <span className="text-[11px] text-muted-foreground block truncate max-w-[170px]">
                              {order.user?.email || "No email"}
                            </span>
                            {order.user?.phone && (
                              <span className="text-[10px] text-muted-foreground block mt-0.5">
                                +91 {order.user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Course Enrolled Column */}
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-1 max-w-xs">
                          <span className="font-bold text-xs text-foreground block font-outfit truncate">
                            {order.course?.title || "Course Enrollment"}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <BookOpen className="h-3 w-3 text-muted-foreground/70" />
                            Direct LMS Enrollment
                          </span>
                        </div>
                      </td>

                      {/* Amount & GST Column */}
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-0.5">
                          <span className="text-sm font-bold text-foreground font-outfit tabular-nums block">
                            ₹{order.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Base: ₹{order.baseAmount.toFixed(2)} + GST: ₹{order.gstAmount.toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Date & Time Column */}
                      <td className="px-6 py-4 align-top text-xs">
                        <span className="font-semibold text-foreground block">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4 align-top">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border",
                            order.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : order.status === "pending"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                          )}
                        >
                          {order.status === "paid" && <CheckCircle2 className="h-3 w-3" />}
                          {order.status === "pending" && <Clock className="h-3 w-3" />}
                          {order.status !== "paid" && order.status !== "pending" && <AlertCircle className="h-3 w-3" />}
                          <span>{order.status}</span>
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveOrderDetail(order)}
                            className="rounded-xl text-xs font-semibold gap-1.5 hover:bg-muted transition-colors h-8"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Details</span>
                          </Button>

                          {order.status === "paid" ? (
                            <a
                              href={`/api/invoices/download/${order.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 text-xs font-bold transition-all h-8 shadow-2xs"
                              title="Download PDF Invoice"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Invoice</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic px-1">
                              No invoice
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                        <Receipt className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground font-outfit">
                          No transactions found
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {searchTerm || statusFilter !== "all" || selectedCourseFilter !== "all"
                            ? "No orders match your search keyword or selected filters."
                            : "No orders have been recorded in the database yet."}
                        </p>
                      </div>
                      {(searchTerm || statusFilter !== "all" || selectedCourseFilter !== "all") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            setSelectedCourseFilter("all");
                          }}
                          className="rounded-xl text-xs font-semibold"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card-Based Orders List (Visible on mobile screens < md) */}
      <div className="block md:hidden space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const initials = order.user?.fullName
              ? order.user.fullName
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()
              : "CU";

            return (
              <Card key={order.id} className="rounded-2xl border-border/80 shadow-2xs p-4 space-y-3">
                {/* Header Row: Payment ID, Status, Amount */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-foreground block truncate max-w-[150px]">
                        {order.razorpayPaymentId || order.razorpayOrderId || "Direct Order"}
                      </span>
                      {(order.razorpayPaymentId || order.razorpayOrderId) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              order.razorpayPaymentId || order.razorpayOrderId,
                              `mobile-rzp-${order.id}`
                            )
                          }
                          className="p-1 rounded bg-muted/60 text-muted-foreground hover:text-foreground"
                          title="Copy ID"
                        >
                          {copiedId === `mobile-rzp-${order.id}` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <span className="text-base font-bold text-foreground font-outfit block">
                      ₹{order.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.2 text-[9px] font-bold rounded-full uppercase tracking-wider border",
                        order.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : order.status === "pending"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                      )}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Customer Profile Row */}
                <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/50 text-xs">
                  <Avatar className="h-9 w-9 border border-border/80 shadow-2xs shrink-0">
                    {order.user?.avatarUrl && (
                      <AvatarImage src={order.user.avatarUrl} alt={order.user.fullName || "Customer"} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-foreground block font-outfit truncate">
                      {order.user?.fullName || "Learner Account"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {order.user?.email || "No email"}
                    </span>
                  </div>
                </div>

                {/* Course Title */}
                <div className="text-xs space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Purchased Course
                  </span>
                  <span className="font-semibold text-foreground block font-outfit">
                    {order.course?.title || "Course Enrollment"}
                  </span>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveOrderDetail(order)}
                    className="flex-1 rounded-xl text-xs font-semibold gap-1.5 h-9"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Details</span>
                  </Button>

                  {order.status === "paid" ? (
                    <a
                      href={`/api/invoices/download/${order.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 text-xs font-bold transition-all h-9"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>PDF Invoice</span>
                    </a>
                  ) : null}
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="rounded-2xl border-border/80 shadow-2xs p-8 text-center text-muted-foreground space-y-3">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <h4 className="text-base font-bold text-foreground font-outfit">No transactions match</h4>
            <p className="text-xs text-muted-foreground">Try clearing search filters.</p>
          </Card>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ORDER DETAILS & TAX INVOICE MODAL / DRAWER */}
      {/* ========================================================================= */}
      {activeOrderDetail && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-border/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/80 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold font-outfit text-foreground">
                    Transaction Details
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                      activeOrderDetail.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : activeOrderDetail.status === "pending"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                    )}
                  >
                    {activeOrderDetail.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Order placed on{" "}
                  {new Date(activeOrderDetail.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveOrderDetail(null)}
                className="h-8 w-8 rounded-xl bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 max-h-[60vh]">
              {/* Financial Calculation Hero Box */}
              <div className="bg-muted/40 p-4 sm:p-5 rounded-2xl border border-border/80 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Payment Breakdown (INR ₹)
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Taxable Base Amount:</span>
                    <span className="font-semibold text-foreground font-mono">
                      ₹{activeOrderDetail.baseAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>GST (18% Integrated GST):</span>
                    <span className="font-semibold text-foreground font-mono">
                      ₹{activeOrderDetail.gstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-sm sm:text-base font-bold text-foreground">
                    <span className="font-outfit">Total Paid Amount:</span>
                    <span className="text-primary font-outfit text-lg font-extrabold">
                      ₹{activeOrderDetail.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Profile Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>Customer Information</span>
                </h4>
                <div className="bg-card p-4 rounded-xl border border-border/80 shadow-2xs space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Student Name:</span>
                    <span className="font-bold text-foreground font-outfit">
                      {activeOrderDetail.user?.fullName || "Registered Student"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email Address:</span>
                    <span className="font-medium text-foreground">
                      {activeOrderDetail.user?.email || "No email"}
                    </span>
                  </div>
                  {activeOrderDetail.user?.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Mobile Phone:</span>
                      <span className="font-medium text-foreground">
                        +91 {activeOrderDetail.user.phone}
                      </span>
                    </div>
                  )}
                  {activeOrderDetail.user?.id && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <span className="text-muted-foreground font-mono text-[10px]">User UUID:</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {activeOrderDetail.user.id}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Course Product Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Enrolled Course</span>
                </h4>
                <div className="bg-card p-4 rounded-xl border border-border/80 shadow-2xs flex items-center justify-between gap-3 text-xs">
                  <div>
                    <h5 className="font-bold text-sm text-foreground font-outfit">
                      {activeOrderDetail.course?.title || "Course Enrollment"}
                    </h5>
                    <span className="text-[11px] text-muted-foreground">
                      Access granted automatically via payment verification.
                    </span>
                  </div>
                  {activeOrderDetail.course?.slug && (
                    <Link
                      href={`/courses/${activeOrderDetail.course.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/80 text-[11px] font-semibold hover:bg-muted transition-colors shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Catalog</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Razorpay Gateway Audit */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Razorpay Payment Gateway Reference</span>
                </h4>
                <div className="bg-card p-4 rounded-xl border border-border/80 shadow-2xs space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payment ID:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                      <span>{activeOrderDetail.razorpayPaymentId || "Awaiting Capture"}</span>
                      {activeOrderDetail.razorpayPaymentId && (
                        <button
                          type="button"
                          onClick={() => handleCopy(activeOrderDetail.razorpayPaymentId!, "detail-pay-id")}
                          className="text-muted-foreground hover:text-foreground"
                          title="Copy"
                        >
                          {copiedId === "detail-pay-id" ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Order ID:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                      <span>{activeOrderDetail.razorpayOrderId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeOrderDetail.razorpayOrderId, "detail-ord-id")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy"
                      >
                        {copiedId === "detail-ord-id" ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Internal Order UUID:</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {activeOrderDetail.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tax Invoice Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span>GST Tax Invoice</span>
                </h4>
                <div className="bg-card p-4 rounded-xl border border-border/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground font-outfit block">
                      {activeOrderDetail.invoice?.invoiceNumber
                        ? `Invoice No: ${activeOrderDetail.invoice.invoiceNumber}`
                        : "Official LMS Tax Invoice"}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Compliant with Indian GST guidelines (HSN/SAC 9992 Educational Services).
                    </span>
                  </div>

                  {activeOrderDetail.status === "paid" ? (
                    <a
                      href={`/api/invoices/download/${activeOrderDetail.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-2xs shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">
                      Available after payment capture
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
              {activeOrderDetail.status === "paid" ? (
                <a
                  href={`/api/invoices/download/${activeOrderDetail.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-2xs"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Tax Invoice PDF</span>
                </a>
              ) : (
                <div />
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveOrderDetail(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Close Window
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
