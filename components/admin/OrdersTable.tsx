/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Search } from "lucide-react";

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

  const filteredOrders = initialOrders.filter((order) => {
    const term = searchTerm.toLowerCase();
    const payId = (order.razorpay_payment_id || "").toLowerCase();
    const ordId = (order.razorpay_order_id || "").toLowerCase();
    
    const userObj = Array.isArray(order.users) ? order.users[0] : order.users;
    const courseObj = Array.isArray(order.courses) ? order.courses[0] : order.courses;

    const studentName = (userObj?.full_name || "Guest").toLowerCase();
    const studentEmail = (userObj?.email || "").toLowerCase();
    const courseTitle = (courseObj?.title || "").toLowerCase();

    return (
      payId.includes(term) ||
      ordId.includes(term) ||
      studentName.includes(term) ||
      studentEmail.includes(term) ||
      courseTitle.includes(term)
    );
  });

  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
      {/* Table Filters */}
      <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search orders by name, email, course, or transaction ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="text-xs font-semibold text-muted-foreground">
          Showing {filteredOrders.length} of {initialOrders.length} transactions
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
              <th className="px-6 py-4">Transaction ID</th>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Course</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const userObj = Array.isArray(order.users) ? order.users[0] : order.users;
                const courseObj = Array.isArray(order.courses) ? order.courses[0] : order.courses;

                return (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-foreground">
                      {order.razorpay_payment_id || order.razorpay_order_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-foreground">
                        {userObj?.full_name || "Guest"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {userObj?.email || "No Email"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {courseObj?.title || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">
                      ₹{order.amount}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        order.status === "paid" 
                          ? "bg-green-500/10 text-green-600" 
                          : order.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-600"
                          : "bg-red-500/10 text-red-600"
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No orders found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
