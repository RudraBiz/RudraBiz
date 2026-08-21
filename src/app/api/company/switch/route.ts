import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_COMPANY_COOKIE } from "@/lib/company-context";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { companyId } = await req.json();
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required." }, { status: 400 });
  }

  // Never trust the client — confirm this user actually belongs to the company.
  const membership = await prisma.companyUser.findFirst({
    where: { userId: session.user.id, companyId },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "You do not have access to this company." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ success: true, companyId });
  response.cookies.set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
