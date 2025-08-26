import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "@/lib/repos/user-repo";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional().nullable(),
  password: z.string().min(8),
});

// Ensure this runs on Node runtime
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, name = null, password } = parsed.data;

    // 1) Email unique?
    const exists = await getUserByEmail(email);
    if (exists) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    // 2) Hash & create
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      email,
      name,
      passwordHash,
      roles: ["USER"],
    });

    // 3) Return CREATED — client will sign in via NextAuth
    return NextResponse.json(
      { user: { id: user!.id, email: user!.email } },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/auth/register error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
