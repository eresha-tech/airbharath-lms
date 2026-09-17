import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import OrdersTable from "@/components/admin/OrdersTable";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  const ordersList = await db.query.orders.findMany({
    with: {
      user: true,
      course: true,
    },
    orderBy: [desc(orders.createdAt)],
  });

  const formattedOrders = ordersList.map((o: any) => ({
    id: o.id,
    razorpay_order_id: o.razorpayOrderId,
    razorpay_payment_id: o.razorpayPaymentId,
    amount: o.amount,
    status: o.status,
    created_at: o.createdAt,
    users: {
      full_name: o.user?.fullName,
      email: o.user?.email,
    },
    courses: {
      title: o.course?.title,
    },
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
          Orders & Payment Transactions
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Monitor Razorpay transaction logs, payment verifications, and student purchase history.
        </p>
      </div>

      <OrdersTable initialOrders={formattedOrders} />
    </div>
  );
}
