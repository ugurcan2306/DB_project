import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { requireSupplierSession } from "@/lib/supplier-auth";
import { logSupplierAction } from "@/lib/supplier-history";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSupplierSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json()) as { status?: "pending" | "accepted" | "packed" | "fulfilled" | "cancelled" };
  if (!body.status) {
    return NextResponse.json({ error: "status is required." }, { status: 400 });
  }

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const previous = await client.query<{ status: string; home_cook_id: string | null; total_price: number }>(
      `SELECT status, home_cook_id, total_price
       FROM supplier_orders
       WHERE id = $1 AND supplier_id = $2`,
      [id, session.user.id],
    );

    if (!previous.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const prevOrder = previous.rows[0];

    await client.query(
      `UPDATE supplier_orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND supplier_id = $3`,
      [body.status, id, session.user.id],
    );

    // Refund user if order is cancelled
    if (body.status === "cancelled" && prevOrder.status !== "cancelled" && prevOrder.home_cook_id) {
      await client.query(
        `UPDATE users
         SET balance = balance + $1
         WHERE id = $2`,
        [prevOrder.total_price, prevOrder.home_cook_id],
      );
    }

    await logSupplierAction(
      {
        supplierId: session.user.id,
        supplierOrderId: id,
        actionType: "order_status_update",
        note: `Order status changed from ${prevOrder.status} to ${body.status}.`,
      },
      client,
    );

    if (body.status === "fulfilled") {
      await logSupplierAction(
        {
          supplierId: session.user.id,
          supplierOrderId: id,
          actionType: "order_fulfilled",
          note: "Supplier marked order as fulfilled.",
        },
        client,
      );
    }

    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Could not update order status." }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ success: true });
}
