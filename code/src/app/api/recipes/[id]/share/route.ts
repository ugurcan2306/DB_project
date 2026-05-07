import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "verified_chef") {
    return NextResponse.json({ error: "Only verified chefs can share recipes." }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();

  const result = await db.query<{ is_published: boolean }>(
    `UPDATE recipes
     SET is_published = TRUE, updated_at = NOW()
     WHERE id = $1 AND author_id = $2 AND is_published = FALSE AND is_deleted = FALSE
     RETURNING is_published`,
    [id, session.user.id],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Recipe not found or not yours." }, { status: 404 });
  }

  return NextResponse.json({ is_published: result.rows[0].is_published });
}
