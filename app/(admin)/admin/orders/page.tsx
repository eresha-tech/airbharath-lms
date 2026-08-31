import { createAdminClient } from "@/lib/supabase-server";
import OrdersTable from "@/components/admin/OrdersTable";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  const supabase = createAdminClient();

  // Fetch all orders using Admin Client to bypass RLS policies
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id,
      razorpay_order_id,
      razorpay_payment_id,
      amount,
      status,
      created_at,
      users (
        full_name,
        email
      ),
      courses (
        title
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      {/* Top Section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Transaction History</h1>
        <p className="text-muted-foreground text-sm">Monitor all invoice payments, purchases, and orders logs.</p>
      </div>

      {/* Orders List / Table Component */}
      <OrdersTable initialOrders={orders || []} />
    </div>
  );
}
