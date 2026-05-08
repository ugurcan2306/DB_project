import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createChallenge } from "@/lib/challenges";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    description,
    emoji,
    starts_at,
    ends_at,
    target_count,
    required_tag,
    required_ingredient_id,
    reward_badge_id,
    reward_points,
  } = body;

  if (!title || !description || !ends_at || !target_count) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await createChallenge({
    title,
    description,
    emoji: emoji || "🏆",
    starts_at: starts_at || null,
    ends_at,
    target_count: Number(target_count),
    required_tag: required_tag || null,
    required_ingredient_id: required_ingredient_id || null,
    reward_badge_id: reward_badge_id || null,
    reward_points: Number(reward_points) || 100,
  });

  return NextResponse.json({ ok: true });
}
