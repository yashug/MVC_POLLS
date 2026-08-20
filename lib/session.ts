import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type SessionData = {
  villaId?: number;
  villaNo?: number;
  isAdmin?: boolean;
};

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("SESSION_SECRET must be set to at least 32 characters (see .env.local)");
}

export const sessionOptions: SessionOptions = {
  password: secret,
  cookieName: "mvc_polls",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 60, // the festival plus a comfortable tail
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** Pages that need a logged-in villa. */
export async function requireVilla() {
  const session = await getSession();
  if (!session.villaId || !session.villaNo) redirect("/login");
  return { villaId: session.villaId, villaNo: session.villaNo };
}

/** Pages that need the committee login. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session.isAdmin) redirect("/admin/login");
  return session;
}
