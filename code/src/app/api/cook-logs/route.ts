import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { creditRoyaltyForCookLog } from "@/lib/royalties";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { recipeId?: string; rating?: number };

  if (!body.recipeId) return NextResponse.json({ error: "recipeId is required." }, { status: 400 });
  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const prevSourceRes = await client.query<{ source: string }>(
      `SELECT source FROM cook_logs WHERE user_id = $1 AND recipe_id = $2`,
      [session.user.id, body.recipeId],
    );
    const prevSource = prevSourceRes.rows[0]?.source ?? null;

    await client.query(
      `INSERT INTO cook_logs (user_id, recipe_id, rating, source)
       VALUES ($1, $2, $3, 'manual')
       ON CONFLICT (user_id, recipe_id)
       DO UPDATE SET rating = EXCLUDED.rating, cooked_at = NOW()`,
      [session.user.id, body.recipeId, body.rating],
    );

    await creditRoyaltyForCookLog(client, body.recipeId, prevSource, "manual");

    await client.query("COMMIT");
    return NextResponse.json({ success: true, rating: body.rating });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Failed to save cook log." }, { status: 500 });
  } finally {
    client.release();
  }
}
