import { NextResponse } from "next/server";
import { signIn } from "@/auth";
import { evaluateMagicLinkRequest, magicLinkBodySchema } from "@/lib/auth";
import { AUTH_ERRORS, magicLinkSendSucceeded } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: AUTH_ERRORS.empty }, { status: 400 });
  }

  const parsed = magicLinkBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: AUTH_ERRORS.empty }, { status: 400 });
  }

  const decision = evaluateMagicLinkRequest(parsed.data.email);
  if (!decision.ok) {
    return NextResponse.json({ error: decision.error }, { status: 403 });
  }

  try {
    const redirectUrl = await signIn("nodemailer", {
      email: decision.email,
      redirect: false,
      redirectTo: "/heute",
    });

    if (
      typeof redirectUrl !== "string" ||
      !magicLinkSendSucceeded(redirectUrl)
    ) {
      return NextResponse.json({ error: AUTH_ERRORS.sendFailed }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ error: AUTH_ERRORS.sendFailed }, { status: 500 });
  }
}
