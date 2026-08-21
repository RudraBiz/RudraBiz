import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";

/**
 * Returns the currently logged-in user (full DB record).
 * Replaces the old dev-user.ts stub — same signature, real session lookup.
 * Redirects to /login if there is no session (matches the old stub's
 * "throw if missing" behavior, but sends the user somewhere useful instead
 * of crashing the page).
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}

/**
 * Same lookup but returns null instead of redirecting.
 * Use this in places (like layout checks) where you want to branch
 * on auth state rather than force a redirect.
 */
export async function getCurrentUserOrNull() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return prisma.user.findUnique({ where: { id: session.user.id } });
}
