import React from "react";
import { db } from "@/lib/db";
import { orders, invoices } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import OrdersTable, { FormattedOrder } from "@/components/admin/OrdersTable";
import { Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  const [ordersList, invoicesList] = await Promise.all([
    db.query.orders.findMany({
      with: {
        user: true,
        course: true,
      },
      orderBy: [desc(orders.createdAt)],
    }),
    db.query.invoices.findMany(),
  ]);

  const formattedOrders: FormattedOrder[] = ordersList.map((o) => {
    const inv = invoicesList.find((i) => i.orderId === o.id);
    const totalAmount = Number(o.amount) || 0;
    const baseAmount = inv
      ? Number(inv.taxableAmount)
      : Math.round((totalAmount / 1.18) * 100) / 100;
    const gstAmount = inv
      ? Number(inv.gstAmount)
      : Math.round((totalAmount - baseAmount) * 100) / 100;

    return {
      id: o.id,
      razorpayOrderId: o.razorpayOrderId,
      razorpayPaymentId: o.razorpayPaymentId,
      amount: totalAmount,
      baseAmount,
      gstAmount,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      user: o.user
        ? {
            id: o.user.id,
            fullName: o.user.fullName,
            email: o.user.email,
            phone: o.user.phone,
            avatarUrl: o.user.avatarUrl,
          }
        : null,
      course: o.course
        ? {
            id: o.course.id,
            title: o.course.title,
            slug: o.course.slug,
            thumbnailUrl: o.course.thumbnailUrl,
            price: Number(o.course.price || 0),
          }
        : null,
      invoice: inv
        ? {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            taxableAmount: Number(inv.taxableAmount),
            gstAmount: Number(inv.gstAmount),
            totalAmount: Number(inv.totalAmount),
          }
        : null,
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              Orders & Payment Transactions
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Monitor Razorpay transaction logs, payment settlements, GST tax invoices, and student purchase history.
          </p>
        </div>
      </div>

      <OrdersTable initialOrders={formattedOrders} />
    </div>
  );
}
