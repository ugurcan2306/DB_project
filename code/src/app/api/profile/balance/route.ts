import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/pool";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { amount?: number };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }

  const result = await getDb().query<{ balance: string }>(
    `UPDATE users
     SET balance = balance + $1::numeric
     WHERE id = $2
     RETURNING balance`,
    [amount, session.user.id],
  );

  return NextResponse.json({ success: true, balance: result.rows[0]?.balance ?? "0" });
}

