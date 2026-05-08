import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { autoLogRecipeForChallenges } from "@/lib/challenges";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { recipeId?: string; rating?: number };

  if (!body.recipeId) return NextResponse.json({ error: "recipeId is required." }, { status: 400 });
  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");

    // Was this user's first time logging this recipe? If yes, we'll bump challenges.
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM cook_logs WHERE user_id = $1 AND recipe_id = $2`,
      [session.user.id, body.recipeId],
    );
    const isFirstLog = existing.rowCount === 0;

    // Royalty crediting is handled by TRG_Update_Chef_Royalty (db trigger).
    // For 'manual' inserts the trigger credits +$0.10. If a row already exists
    // (e.g. user bought it earlier), source stays 'purchased' and the trigger
    // does nothing on a rating-only update — which is correct.
    await client.query(
      `INSERT INTO cook_logs (user_id, recipe_id, rating, source)
       VALUES ($1, $2, $3, 'manual')
       ON CONFLICT (user_id, recipe_id)
       DO UPDATE SET rating = EXCLUDED.rating, cooked_at = NOW()`,
      [session.user.id, body.recipeId, body.rating],
    );

    // Spec: "The system tracks progress as the user cooks qualifying recipes"
    // → submitting a cook log counts as having cooked the recipe, so bump
    // any matching active challenges. Only fire on first log to avoid double-counting
    // when the user later edits their rating.
    let challengesAdvanced: string[] = [];
    if (isFirstLog) {
      challengesAdvanced = await autoLogRecipeForChallenges(client, session.user.id, body.recipeId);
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, rating: body.rating, challengesAdvanced });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Failed to save cook log." }, { status: 500 });
  } finally {
    client.release();
  }
}
