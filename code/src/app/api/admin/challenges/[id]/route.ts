import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateChallenge, deleteChallenge } from "@/lib/challenges";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, description, emoji, ends_at, target_count, required_tag, reward_points } = body;

  if (!title || !description || !ends_at || !target_count) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await updateChallenge(id, {
    title,
    description,
    emoji: emoji || "🏆",
    ends_at,
    target_count: Number(target_count),
    required_tag: required_tag || null,
    reward_points: Number(reward_points) || 100,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await deleteChallenge(id);
  return NextResponse.json({ ok: true });
}
