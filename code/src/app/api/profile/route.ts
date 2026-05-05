import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile, updateUserProfile } from "@/lib/profile";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(session.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    fullName?: string;
    avatarUrl?: string | null;
    deliveryAddress?: string | null;
    businessName?: string | null;
    businessAddress?: string | null;
    chefBio?: string | null;
  };

  if (!body.fullName?.trim()) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }

  await updateUserProfile(session.user.id, session.user.role, {
    fullName: body.fullName,
    avatarUrl: body.avatarUrl ?? null,
    deliveryAddress: body.deliveryAddress ?? null,
    businessName: body.businessName ?? null,
    businessAddress: body.businessAddress ?? null,
    chefBio: body.chefBio ?? null,
  });

  return NextResponse.json({ success: true });
}
