import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/pool";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Avatar file is required." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Allowed types: jpg, png, webp." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "Avatar size must be <= 5MB." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = extensionFromMime(file.type);
  const fileName = `${session.user.id}-${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  const publicUrl = `/uploads/avatars/${fileName}`;
  await getDb().query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [publicUrl, session.user.id]);

  return NextResponse.json({ avatarUrl: publicUrl });
}
