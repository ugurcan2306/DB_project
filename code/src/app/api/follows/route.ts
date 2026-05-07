import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { followChef, unfollowChef } from "@/lib/follows";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { chefId?: string };
  if (!body.chefId) return NextResponse.json({ error: "chefId required" }, { status: 400 });

  try {
    await followChef(session.user.id, body.chefId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to follow." },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const chefId = url.searchParams.get("chefId");
  if (!chefId) return NextResponse.json({ error: "chefId required" }, { status: 400 });

  await unfollowChef(session.user.id, chefId);
  return NextResponse.json({ ok: true });
}
