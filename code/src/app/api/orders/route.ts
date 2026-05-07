import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/pool";

type Row = {
  order_id: string;
  shopping_cart_id: string | null;
  status: "pending" | "accepted" | "packed" | "fulfilled" | "cancelled";
  total_price: string;
  created_at: string;
  updated_at: string;
  supplier_id: string;
  business_name: string | null;
  ingredient_name: string | null;
  quantity: string | null;
  unit: string | null;
  line_total: string | null;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "home_cook") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await getDb().query<Row>(
    `SELECT so.id AS order_id,
            so.shopping_cart_id,
            so.status,
            so.total_price,
            so.created_at,
            so.updated_at,
            so.supplier_id,
            ls.business_name,
            i.ingredient_name,
            soi.quantity::text,
            soi.unit,
            soi.line_total::text
     FROM supplier_orders so
     LEFT JOIN local_suppliers ls ON ls.user_id = so.supplier_id
     LEFT JOIN supplier_order_items soi ON soi.supplier_order_id = so.id
     LEFT JOIN ingredients i ON i.id = soi.ingredient_id
     WHERE so.home_cook_id = $1
     ORDER BY so.created_at DESC, so.id, i.ingredient_name`,
    [session.user.id],
  );

  const grouped = new Map<
    string,
    {
      id: string;
      createdAt: string;
      updatedAt: string;
      totalPrice: number;
      suppliers: Array<{
        supplierOrderId: string;
        supplierId: string;
        supplierName: string;
        status: Row["status"];
        totalPrice: number;
        items: Array<{ ingredientName: string; quantity: string; unit: string; lineTotal: string }>;
      }>;
    }
  >();

  for (const row of result.rows) {
    const groupId = row.shopping_cart_id ?? row.order_id;
    if (!grouped.has(groupId)) {
      grouped.set(groupId, {
        id: groupId,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        totalPrice: 0,
        suppliers: [],
      });
    }
    const g = grouped.get(groupId)!;
    let supplier = g.suppliers.find((s) => s.supplierOrderId === row.order_id);
    if (!supplier) {
      supplier = {
        supplierOrderId: row.order_id,
        supplierId: row.supplier_id,
        supplierName: row.business_name ?? "Local Supplier",
        status: row.status,
        totalPrice: Number(row.total_price),
        items: [],
      };
      g.suppliers.push(supplier);
      g.totalPrice += Number(row.total_price);
    }
    if (row.ingredient_name && row.quantity && row.unit && row.line_total) {
      supplier.items.push({
        ingredientName: row.ingredient_name,
        quantity: row.quantity,
        unit: row.unit,
        lineTotal: row.line_total,
      });
    }
  }

  const orders = Array.from(grouped.values()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const activeOrders = orders.filter((o) => !o.suppliers.every((s) => s.status === "fulfilled"));
  const historyOrders = orders.filter((o) => o.suppliers.every((s) => s.status === "fulfilled"));

  return NextResponse.json({ activeOrders, historyOrders });
}

