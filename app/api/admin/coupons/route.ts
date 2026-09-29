import { NextResponse } from "next/server";
import { getAuthorizedAdminSession } from "@/lib/admin-authorization";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { serverTrack } from "@/lib/analytics-server";

export async function GET() {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const session = await getAuthorizedAdminSession();
    if (!session) {
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

    await serverTrack(session.id, "admin_coupon_created", {
      coupon_code: newCoupon.code,
      discount_type: newCoupon.discountType,
      discount_value: Number(newCoupon.discountValue) || 0,
    });

    return NextResponse.json({ coupon: newCoupon });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
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
