import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/pool";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  const result = q
    ? await getDb().query(
        `SELECT ia.id, ia.alias_name
         FROM ingredient_aliases ia
         WHERE ia.alias_name ILIKE $1
         ORDER BY ia.alias_name ASC
         LIMIT 50`,
        [`%${q}%`],
      )
    : await getDb().query(
        `SELECT ia.id, ia.alias_name
         FROM ingredient_aliases ia
         ORDER BY ia.alias_name ASC
         LIMIT 200`,
      );

  return NextResponse.json({ aliases: result.rows });
}

