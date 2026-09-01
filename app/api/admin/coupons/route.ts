import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const couponsList = await db.query.coupons.findMany({
      orderBy: [asc(coupons.expiryDate)],
    });

    const formattedCoupons = couponsList.map((c: any) => ({
      id: c.id,
      code: c.code,
      discount_type: c.discountType,
      discount_value: c.discountValue,
      expiry_date: c.expiryDate,
      usage_limit: c.usageLimit,
      used_count: c.usedCount || 0,
    }));

    return NextResponse.json({ coupons: formattedCoupons });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { code, discountType, discountValue, expiryDate, usageLimit } = await req.json();

    const [newCoupon] = await db
      .insert(coupons)
      .values({
        code: code.toUpperCase().trim(),
        discountType,
        discountValue,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
      })
      .returning();

    return NextResponse.json({ coupon: newCoupon });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(coupons).where(eq(coupons.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
