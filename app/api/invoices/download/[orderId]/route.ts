import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPersistedAdminRole } from "@/lib/admin-authorization";
import { db } from "@/lib/db";
import { invoices, orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAndSaveInvoice } from "@/lib/invoice-generator";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: privateHeaders });
    }

    // 1. Fetch order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404, headers: privateHeaders });
    }

    // Verify user owns order or is admin
    const isAdmin = await hasPersistedAdminRole(session);
    if (order.userId !== session.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: privateHeaders });
    }

    // 2. Fetch existing invoice or generate new
    let invoice = await db.query.invoices.findFirst({
      where: eq(invoices.orderId, orderId),
    });

    if (!invoice) {
      invoice = await generateAndSaveInvoice(orderId);
    }

    if (!invoice || !invoice.pdfUrl) {
      return NextResponse.json({ error: "Failed to generate invoice PDF" }, { status: 500, headers: privateHeaders });
    }

    // Convert data URL / base64 to PDF Buffer
    const base64Data = invoice.pdfUrl.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(base64Data, "base64");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber || 'invoice'}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("Invoice Download API Error:", err);
    return NextResponse.json({ error: err.message || "Failed to download invoice" }, { status: 500, headers: privateHeaders });
  }
}
