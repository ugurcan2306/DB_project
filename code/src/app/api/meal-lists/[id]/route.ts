import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  const result = await db.query(
    `DELETE FROM meal_lists WHERE id = $1 AND user_id = $2`,
    [id, session.user.id],
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "List not found or not yours." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
