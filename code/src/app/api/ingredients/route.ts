import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getDb().query(
    `SELECT i.id, i.ingredient_name, ic.category_name
     FROM ingredients i
     LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
     ORDER BY ic.category_name ASC NULLS LAST, i.ingredient_name ASC`,
  );

  return NextResponse.json({ ingredients: result.rows });
}
