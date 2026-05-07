import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const result = await db.query(
    `SELECT r.id, r.title, r.description, r.difficulty, r.cooking_time_minutes,
            r.servings, r.dietary_tags, r.cover_image_url, r.created_at,
            u.full_name AS author_name
     FROM recipes r
     JOIN users u ON u.id = r.author_id
     WHERE r.is_published = TRUE
       AND u.role = 'verified_chef'
       AND r.author_id != $1
     ORDER BY r.created_at DESC`,
  );

  return NextResponse.json({ recipes: result.rows });
}
