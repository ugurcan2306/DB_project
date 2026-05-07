import { NextResponse } from "next/server";
import { getDb } from "@/db/pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  // If query is empty, return full canonical list (for admin usage / initial load).
  // If query is provided, search both canonical names and aliases, returning canonical ingredient rows.
  const result = q
    ? await getDb().query(
        `WITH matches AS (
           SELECT i.id, i.ingredient_name, ic.category_name, NULL::text AS matched_alias
           FROM ingredients i
           LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
           WHERE i.ingredient_name ILIKE $1
           UNION
           SELECT i.id, i.ingredient_name, ic.category_name, ia.alias_name AS matched_alias
           FROM ingredient_aliases ia
           JOIN ingredients i ON i.id = ia.canonical_ingredient_id
           LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
           WHERE ia.alias_name ILIKE $1
         )
         SELECT DISTINCT ON (id) id, ingredient_name, category_name, matched_alias
         FROM matches
         ORDER BY id, matched_alias NULLS FIRST, ingredient_name ASC
         LIMIT 50`,
        [`%${q}%`],
      )
    : await getDb().query(
        `SELECT i.id, i.ingredient_name, ic.category_name, NULL::text AS matched_alias
         FROM ingredients i
         LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
         ORDER BY ic.category_name ASC NULLS LAST, i.ingredient_name ASC`,
      );

  return NextResponse.json({ ingredients: result.rows });
}
